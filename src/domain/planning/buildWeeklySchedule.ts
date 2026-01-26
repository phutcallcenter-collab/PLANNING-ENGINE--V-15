/**
 * ⚠️ HARDENED MODULE
 *
 * @description The core deterministic function that resolves the status for a single representative on a single day.
 * It follows a strict priority order. Any changes here MUST be accompanied by a new test case that
 * justifies the modification. The existing tests in `buildWeeklySchedule.test.ts` serve as the contract.
 *
 * @see buildWeeklySchedule.test.ts
 */
import {
  Representative,
  Incident,
  WeeklyPlan,
  DailyStatus,
  DayInfo,
  WeeklyPresence,
  DailyPresence,
  SpecialSchedule,
  ShiftAssignment
} from '../types'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { isWithinInterval, parseISO } from 'date-fns'
import { getEffectiveSchedule } from '@/application/scheduling/specialScheduleAdapter'
import { DayPlan, DayReality, DayResolution } from './dayResolution'
import { computeDayMetrics } from './computeDayMetrics'
import { dayResolutionToDailyPresence } from './dayResolutionAdapter'
import { CoverageLookup, Coverage, findCoverageForDay } from './coverage'

/**
 * The core deterministic function that resolves the status for a single representative on a single day.
 * It follows a Layered Approach (Composition over Inheritance):
 * 
 * Layer 1: Assignment Resolution (Where should they be?)
 * - Priority A: Manual Override (OVERRIDE type)
 * - Priority B: Swap (SWAP type)
 * - Priority C: Special Schedule (Adapter)
 * - Priority D: Base Schedule (Adapter fallback)
 * 
 * Layer 2: Condition Overlay (What is happening?)
 * - Priority A: Formal Absence (VACATION/LICENSE) -> Forces OFF state
 * - Priority B: Casual Absence (AUSENCIA) -> Annotates Assignment
 * - Default: WORKING
 * 
 * Layer 3: Coverage Projection (Optional)
 * - Coverage is injected at compute time, not during resolution
 * - Adds badges without changing plan or reality
 * 
 * @returns DayResolution with plan, reality, and computed layers
 */
export function resolveDayStatus(
  rep: Representative,
  dayInfo: DayInfo,
  dailyIncidents: Incident[], // All incidents for this day
  specialSchedules: SpecialSchedule[],
  coverage?: CoverageLookup // Optional coverage lookup
): DayResolution {

  // --- Step 0: Identify Inputs (Deterministic Selection) ---
  // If multiple incidents of the same type exist, the most recent one wins.
  const byCreatedAtDesc = (a: Incident, b: Incident) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

  const formalIncident = dailyIncidents
    .filter(i => i.type === 'VACACIONES' || i.type === 'LICENCIA')
    .sort(byCreatedAtDesc)[0]

  const overrideIncident = dailyIncidents
    .filter(i => i.type === 'OVERRIDE')
    .sort(byCreatedAtDesc)[0]

  const swapIncident = dailyIncidents
    .filter(i => i.type === 'SWAP')
    .sort(byCreatedAtDesc)[0]

  const absenceIncident = dailyIncidents
    .filter(i => i.type === 'AUSENCIA')
    .sort(byCreatedAtDesc)[0]

  // --- Step 1: Resolve Assignment (The "Plan") ---
  let assignment: ShiftAssignment = { type: 'NONE' }
  let source: DayPlan['source'] = 'BASE'

  // Priority 0: Formal Absence (Hard Block)
  // 🛑 FIX: Formal incidents (Vacation/License) MUST clear the assignment.
  // They are not just "Status OFF", they are "Assignment NONE".
  if (formalIncident) {
    assignment = { type: 'NONE' }
    source = 'BASE' // Source remains valid but assignment is purged
  } else if (overrideIncident && overrideIncident.assignment) {
    // Priority 1: Manual Override
    assignment = overrideIncident.assignment
    source = 'OVERRIDE'
  } else if (swapIncident && swapIncident.assignment) {
    // Priority 2: Swap (Peer Exchange)
    assignment = swapIncident.assignment
    source = 'SWAP'
  } else {
    // Priority 3: Adapter (Special > Base)
    const effective = getEffectiveSchedule({
      representative: rep,
      dateStr: dayInfo.date,
      baseSchedule: rep.baseSchedule,
      specialSchedules
    })

    if (effective.type === 'OFF') {
      assignment = { type: 'NONE' }
      source = 'BASE'
    } else if (effective.type === 'MIXTO') {
      assignment = { type: 'BOTH' }
      source = effective.source ? 'SPECIAL' : 'BASE' // 🔧 FIX: Check if source exists (truthy)
    } else if (effective.type === 'OVERRIDE' && effective.shift) {
      assignment = { type: 'SINGLE', shift: effective.shift }
      source = 'SPECIAL'
    } else if (effective.type === 'BASE' && effective.shift) {
      assignment = { type: 'SINGLE', shift: effective.shift }
      source = 'BASE'
    }
  }

  const plan: DayPlan = { assignment, source }

  // --- Step 2: Resolve Condition (The "Reality") ---

  // Priority 1: Hard Blocks (Vacations/License)
  if (formalIncident) {
    const reality: DayReality = {
      status: 'OFF',
      incidentType: formalIncident.type,
      incidentId: formalIncident.id
    }

    const computed = computeDayMetrics(plan, reality, coverage)
    return { plan, reality, computed }
  }

  // Priority 2: Absence (Annotates the plan)
  if (absenceIncident) {
    const reality: DayReality = {
      status: 'WORKING', // Semantically "Scheduled to work", but absent
      incidentType: 'AUSENCIA',
      incidentId: absenceIncident.id
    }

    const computed = computeDayMetrics(plan, reality, coverage)
    return { plan, reality, computed }
  }

  // Default: Working as planned or OFF
  const reality: DayReality = {
    status: assignment.type === 'NONE' ? 'OFF' : 'WORKING'
  }

  const computed = computeDayMetrics(plan, reality, coverage)
  return { plan, reality, computed }
}

export function buildWeeklySchedule(
  agents: Representative[],
  incidents: Incident[],
  specialSchedules: SpecialSchedule[],
  weekDays: DayInfo[],
  allCalendarDays: DayInfo[],
  coverages: Coverage[] = [] // New parameter for coverage relationships
): WeeklyPlan {
  if (weekDays.length !== 7) {
    throw new Error('buildWeeklySchedule expects an array of 7 DayInfo objects.')
  }

  const weekStart = weekDays[0].date

  // 1. Pre-process Incidents (Range Expansion)
  // We need to map [Date] -> [Incidents[]] for O(1) lookup per agent/day
  // Key: "repId:date" -> Incident[]
  const dailyIncidentMap = new Map<string, Incident[]>()

  // A. Range Incidents (Vacation/License)
  incidents
    .filter(i => i.type === 'VACACIONES' || i.type === 'LICENCIA')
    .forEach(i => {
      const resolved = resolveIncidentDates(i, allCalendarDays)
      resolved.dates.forEach(date => {
        const key = `${i.representativeId}:${date}`
        if (!dailyIncidentMap.has(key)) dailyIncidentMap.set(key, [])
        dailyIncidentMap.get(key)!.push(i)
      })
    })

  // B. Single Day Incidents (Override/Absence/Swap)
  // Although typically 1 day, we use the resolver to safely handle any duration.
  incidents
    .filter(i => i.type === 'OVERRIDE' || i.type === 'AUSENCIA' || i.type === 'SWAP')
    .forEach(i => {
      const resolved = resolveIncidentDates(i, allCalendarDays)
      resolved.dates.forEach(date => {
        const key = `${i.representativeId}:${date}`
        if (!dailyIncidentMap.has(key)) dailyIncidentMap.set(key, [])
        dailyIncidentMap.get(key)!.push(i)
      })
    })


  // 2. Separate Global vs Individual Special Schedules
  const globalSchedules = specialSchedules.filter(ss => ss.scope === 'GLOBAL')

  // 3. Map Individual Schedules by ID
  const individualSchedulesMap = new Map<string, SpecialSchedule[]>()
  specialSchedules.forEach(ss => {
    if (ss.scope === 'INDIVIDUAL' && ss.targetId) {
      if (!individualSchedulesMap.has(ss.targetId)) {
        individualSchedulesMap.set(ss.targetId, [])
      }
      individualSchedulesMap.get(ss.targetId)!.push(ss)
    }
  })

  return {
    weekStart,
    agents: agents.map(agent => {
      const days: WeeklyPresence['days'] = {}
      const repSchedules = individualSchedulesMap.get(agent.id) || []
      const applicableSchedules = [...globalSchedules, ...repSchedules]

      for (const day of weekDays) {
        const date = day.date

        // Get all incidents for this specific day/agent combo
        const dayIncidents = dailyIncidentMap.get(`${agent.id}:${date}`) || []

        // 🔄 NEW: Find coverage for this day (if any)
        const coverage = findCoverageForDay(agent.id, date, coverages)

        const resolution = resolveDayStatus(
          agent,
          day,
          dayIncidents,
          applicableSchedules,
          coverage // Pass coverage to resolution
        )

        // 🔄 TEMPORARY: Use adapter for backward compatibility
        // TODO: Migrate consumers to use resolution.computed directly
        const legacyPresence = dayResolutionToDailyPresence(resolution, coverage)

        days[date] = legacyPresence
      }

      return {
        representativeId: agent.id,
        days,
      }
    }),
  }
}
