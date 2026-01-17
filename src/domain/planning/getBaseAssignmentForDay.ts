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

  // Resolver incidentes formales (vacaciones, licencias)
  const resolvedFormalIncidents = incidents
    .filter(i => i.type === 'VACACIONES' || i.type === 'LICENCIA')
    .map(i => resolveIncidentDates(i, allCalendarDays, rep))
    .filter(resolved => resolved.dates.length > 0)

  const formalIncident = resolvedFormalIncidents.find(
    resolved =>
      resolved.incident.representativeId === rep.id &&
      resolved.dates.includes(date)
  )

  // Incidentes de un solo día (override, ausencia)
  const singleDayIncident = incidents.find(
    i =>
      (i.type === 'OVERRIDE' || i.type === 'AUSENCIA') &&
      i.representativeId === rep.id &&
      i.startDate === date
  )

  const overrideIncident =
    singleDayIncident?.type === 'OVERRIDE' ? singleDayIncident : undefined
  const isAbsenceDay = singleDayIncident?.type === 'AUSENCIA'

  // Special schedules
  const parsedDate = parseISO(date)
  const specialSchedule = specialSchedules.find(
    ss =>
      ss.representativeId === rep.id &&
      isWithinInterval(parsedDate, {
        start: parseISO(ss.startDate),
        end: parseISO(ss.endDate),
      }) &&
      ss.daysOfWeek.includes(day.dayOfWeek)
  )

  // Resolver estado del día
  const resolvedDay = resolveDayStatus(
    rep,
    day,
    isAbsenceDay,
    formalIncident,
    overrideIncident,
    specialSchedule
  )

  // Convertir ShiftAssignment a ShiftType | 'OFF'
  const assignment = resolvedDay.assignment
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
