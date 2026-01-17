/**
 * ⚠️ HARDENED MODULE
 *
 * @description Determines the availability status of a representative on a specific date.
 * This is the canonical source of truth for availability. It follows a strict priority order
 * and relies on the pre-calculated `weeklyPlan` as the source of truth for WORKING/OFF status.
 *
 * @see useCoverage.ts (consumer)
 * @see buildWeeklySchedule.ts (producer of weeklyPlan)
 */
'use client'
import { Incident } from '../incidents/types'
import { Representative } from '../representatives/types'
import { DayInfo, ISODate } from '../calendar/types'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { WeeklyPlan } from '../planning/types';

export type AvailabilityStatus = 'ACTIVE' | 'OFF' | 'VACATION' | 'LICENSE'

/**
 * Determines the availability status of a representative on a specific date.
 * This is the canonical source of truth for availability.
 * It follows a strict priority order:
 * 1. Blocking Incidents: High-priority incidents (VACATION/LICENSE) determine the status first.
 * 2. Overriding Incidents: An 'AUSENCIA' forces availability to 'OFF' for coverage calculation, even if the plan says 'WORKING'.
 * 3. Weekly Plan: If no blocking incidents, the final status is derived *directly* from the pre-calculated weekly plan.
 *
 * @param rep The representative.
 * @param date The ISO date string to check.
 * @param incidents An array of all incidents.
 * @param weeklyPlan The calculated weekly plan.
 * @param allCalendarDays All relevant calendar days for incident resolution.
 * @returns The availability status.
 */
export function getAvailabilityStatus(
  rep: Representative,
  date: ISODate,
  incidents: Incident[],
  weeklyPlan: WeeklyPlan,
  allCalendarDays: DayInfo[]
): AvailabilityStatus {

  // First, check for incidents that create a definitive non-active state.
  // These have the highest priority over the plan.
  for (const inc of incidents) {
    if (inc.representativeId !== rep.id) continue

    const { dates } = resolveIncidentDates(inc, allCalendarDays, rep)
    if (!dates.includes(date)) continue

    // Priority 1: Formal non-negotiable absences
    if (inc.type === 'VACACIONES' || inc.type === 'LICENCIA') {
      return inc.type === 'VACACIONES' ? 'VACATION' : 'LICENSE'
    }
    
    // Priority 2: Real-world absence. The plan may say WORKING for coverage purposes,
    // but the person is factually unavailable.
    if (inc.type === 'AUSENCIA') {
      return 'OFF'
    }
  }
  
  // If no overriding incidents, the final status is determined *solely* by the weekly plan.
  // The weeklyPlan is the single source of truth for WORKING/OFF status, as it has already resolved
  // the base schedule and any overrides. We do not re-evaluate that logic here.
  const agentPlan = weeklyPlan.agents.find(a => a.representativeId === rep.id)
  const dayPlanStatus = agentPlan?.days[date]?.status

  if (dayPlanStatus === 'WORKING') {
    return 'ACTIVE'
  }
  
  // Any other state in the plan (e.g., OFF) means the person is not active.
  return 'OFF'
}
