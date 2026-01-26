import { Representative, Incident, SpecialSchedule, DayInfo, ShiftType, ISODate } from '../types'
import { parseISO, isWithinInterval } from 'date-fns'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { resolveDayStatus } from './buildWeeklySchedule'

/**
 * ⚠️ LIGHTWEIGHT HELPER FOR VALIDATION
 * 
 * Computes the base assignment for a specific representative on a specific day
 * WITHOUT building the entire weekly plan.
 * 
 * Used for validation during swap creation to check for conflicts.
 * 
 * Returns:
 * - ShiftType ('DAY' | 'NIGHT') if the rep is working that shift
 * - 'OFF' if the rep is not working
 * - null if unable to determine (missing data)
 */
export function getBaseAssignmentForDay(params: {
  rep: Representative
  date: ISODate
  day: DayInfo
  incidents: Incident[]
  specialSchedules: SpecialSchedule[]
  allCalendarDays: DayInfo[]
}): ShiftType | 'OFF' | null {
  const { rep, date, day, incidents, specialSchedules, allCalendarDays } = params

  // Collect all relevant incidents for this day
  const dailyIncidents = incidents.filter(
    i => i.representativeId === rep.id && (
      (i.type === 'OVERRIDE' || i.type === 'AUSENCIA' || i.type === 'SWAP') && i.startDate === date ||
      (i.type === 'VACACIONES' || i.type === 'LICENCIA') &&
      resolveIncidentDates(i, allCalendarDays, rep).dates.includes(date)
    )
  )

  // Resolver estado del día
  const resolvedDay = resolveDayStatus(
    rep,
    day,
    dailyIncidents,
    specialSchedules
  )

  // Convertir ShiftAssignment a ShiftType | 'OFF'
  const assignment = resolvedDay.plan.assignment
  if (!assignment) {
    return 'OFF'
  }

  if (assignment.type === 'NONE') {
    return 'OFF'
  } else if (assignment.type === 'SINGLE') {
    return assignment.shift
  } else if (assignment.type === 'BOTH') {
    // BOTH significa puede trabajar ambos, pero no sabemos cuál está trabajando
    // Para propósitos de validación, retornamos null (ambiguo)
    return null
  }

  return 'OFF'
}
