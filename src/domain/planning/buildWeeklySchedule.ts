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
} from '../types'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { ShiftAssignment } from './shiftAssignment'
import { isWithinInterval, parseISO } from 'date-fns'

/**
 * The core deterministic function that resolves the status for a single representative on a single day.
 * It follows a strict priority order:
 * 1. Formal Incident (VACATION/LICENSE): Highest priority. Always results in OFF and blocks overrides.
 * 2. Manual Override (OVERRIDE): Second highest. It REPLACES the day's assignment completely.
 * 3. Special Schedule: A temporary schedule that overrides the base/mix profile.
 * 4. Absence Incident (AUSENCIA): An 'AUSENCIA' annotates the day but does not change the plan's status.
 * 5. Base Schedule & Mix Profile: The final fallback, determines the "natural" assignment for the day.
 *
 * @returns An object containing the final status, assignment, and the source of that decision.
 */
export function resolveDayStatus(
  rep: Representative,
  dayInfo: DayInfo,
  isAbsenceDay: boolean,
  formalIncident: ReturnType<typeof resolveIncidentDates> | undefined,
  overrideIncident: Incident | undefined,
  specialSchedule: SpecialSchedule | undefined
): Omit<DailyPresence, 'isModified'> {
  // --- Priority 1: Hard blocks (Formal Absences) ---
  if (formalIncident) {
    return {
      status: 'OFF',
      source: 'INCIDENT',
      type: formalIncident.incident.type,
      assignment: { type: 'NONE' },
    }
  }

  // --- Priority 2: Explicit Manual Override ---
  if (overrideIncident && overrideIncident.assignment) {
    return {
      status: overrideIncident.assignment.type === 'NONE' ? 'OFF' : 'WORKING',
      source: 'OVERRIDE',
      assignment: overrideIncident.assignment,
    }
  }

  // --- Priority 3: Special Schedule ---
  // If a special schedule applies, it determines the assignment.
  if (specialSchedule) {
    return {
      status: specialSchedule.assignment.type === 'NONE' ? 'OFF' : 'WORKING',
      source: 'BASE', // Considered a base modification, not an "incident" or "override"
      assignment: specialSchedule.assignment,
    }
  }


  // --- Priority 4: Base Schedule & Mix Profile (Natural Assignment) ---
  const baseStatus = rep.baseSchedule?.[dayInfo.dayOfWeek] ?? 'OFF'

  if (baseStatus === 'OFF') {
    return {
      status: 'OFF',
      source: 'BASE',
      assignment: { type: 'NONE' },
    }
  }

  let naturalAssignment: ShiftAssignment
  const isWeekday = dayInfo.dayOfWeek >= 1 && dayInfo.dayOfWeek <= 4
  const isWeekend =
    dayInfo.dayOfWeek === 0 ||
    dayInfo.dayOfWeek === 5 ||
    dayInfo.dayOfWeek === 6

  if (
    (rep.mixProfile?.type === 'WEEKDAY' && isWeekday) ||
    (rep.mixProfile?.type === 'WEEKEND' && isWeekend)
  ) {
    naturalAssignment = { type: 'BOTH' }
  } else {
    naturalAssignment = { type: 'SINGLE', shift: rep.baseShift }
  }

  // --- Priority 5: Absence Annotation ---
  if (isAbsenceDay) {
    return {
      status: 'WORKING',
      source: 'INCIDENT',
      type: 'AUSENCIA',
      assignment: naturalAssignment,
    }
  }

  // If no other rules apply, return the natural assignment.
  return {
    status: 'WORKING',
    source: 'BASE',
    assignment: naturalAssignment,
  }
}

export function buildWeeklySchedule(
  agents: Representative[],
  incidents: Incident[],
  specialSchedules: SpecialSchedule[],
  weekDays: DayInfo[],
  allCalendarDays: DayInfo[]
): WeeklyPlan {
  if (weekDays.length !== 7) {
    throw new Error('buildWeeklySchedule expects an array of 7 DayInfo objects.')
  }

  const weekStart = weekDays[0].date
  const agentMap = new Map(agents.map(a => [a.id, a]))

  const resolvedFormalIncidents = incidents
    .filter(i => i.type === 'VACACIONES' || i.type === 'LICENCIA')
    .map(i => {
      const representative = agentMap.get(i.representativeId)
      return resolveIncidentDates(i, allCalendarDays, representative)
    })
    .filter(resolved => resolved.dates.length > 0)

  const singleDayIncidentMap = new Map<string, Incident>()
  incidents
    .filter(i => i.type === 'OVERRIDE' || i.type === 'AUSENCIA')
    .forEach(o => {
      singleDayIncidentMap.set(`${o.representativeId}:${o.startDate}`, o)
    })

  const specialSchedulesMap = new Map<string, SpecialSchedule[]>()
  specialSchedules.forEach(ss => {
    if (!specialSchedulesMap.has(ss.representativeId)) {
      specialSchedulesMap.set(ss.representativeId, [])
    }
    specialSchedulesMap.get(ss.representativeId)!.push(ss)
  })

  return {
    weekStart,
    agents: agents.map(agent => {
      const days: WeeklyPresence['days'] = {}
      const agentSpecialSchedules = specialSchedulesMap.get(agent.id) || []

      for (const day of weekDays) {
        const date = day.date
        const parsedDate = parseISO(date)

        const formalIncident = resolvedFormalIncidents.find(
          resolved =>
            resolved.incident.representativeId === agent.id &&
            resolved.dates.includes(date)
        )

        const singleDayIncident = singleDayIncidentMap.get(`${agent.id}:${date}`)
        const overrideIncident =
          singleDayIncident?.type === 'OVERRIDE' ? singleDayIncident : undefined
        const isAbsenceDay = singleDayIncident?.type === 'AUSENCIA'

        const specialSchedule = agentSpecialSchedules.find(ss =>
          isWithinInterval(parsedDate, { start: parseISO(ss.startDate), end: parseISO(ss.endDate) }) &&
          ss.daysOfWeek.includes(day.dayOfWeek)
        )

        const resolvedDay = resolveDayStatus(
          agent,
          day,
          isAbsenceDay,
          formalIncident,
          overrideIncident,
          specialSchedule
        )

        days[date] = {
          status: resolvedDay.status,
          source: resolvedDay.source,
          type: resolvedDay.type,
          assignment: resolvedDay.assignment,
        }
      }

      return {
        representativeId: agent.id,
        days,
      }
    }),
  }
}
