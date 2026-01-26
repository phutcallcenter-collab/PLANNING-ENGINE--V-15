'use client'
import { addDays, parseISO, formatISO, isValid } from 'date-fns'
import type { Incident, Representative } from '../types'
import type { DayInfo, ISODate } from '../calendar/types'
import { parseLocalDate } from '../calendar/parseLocalDate'

export interface ResolvedIncident {
  incident: Incident
  dates: ISODate[]
  start: ISODate | null
  end: ISODate | null
  returnDate?: ISODate
}

/**
 * Calculates the actual calendar dates affected by an incident based on its type.
 * - 'LICENCIA': Counts all consecutive calendar days.
 * - 'VACACIONES': Counts a fixed number of 'WORKING' days, skipping holidays and base schedule OFF days.
 * - Other incidents: Have a duration of 1 day.
 */
export function resolveIncidentDates(
  incident: Incident,
  allCalendarDays: DayInfo[],
  representative?: Representative
): ResolvedIncident {
  if (
    !Array.isArray(allCalendarDays) ||
    !incident.startDate ||
    !isValid(parseISO(incident.startDate))
  ) {
    console.warn(
      `[resolveIncidentDates] Invalid arguments (calendar days or incident date) for incident ${incident.id}. Skipping resolution.`
    )
    return { incident, dates: [], start: null, end: null }
  }

  // --- SPLIT LOGIC BY TYPE ---
  if (incident.type === 'LICENCIA') {
    return resolveLicenseDates(incident, allCalendarDays, representative)
  }

  if (incident.type === 'VACACIONES') {
    return resolveVacationDates(incident, allCalendarDays, representative)
  }

  // Default: Single day incidents (Tardanza, Error, etc)
  return resolveSingleDayIncident(incident, allCalendarDays)
}

// ----------------------------------------------------------------------
// HELPER: LICENCIA (Continuous Calendar Days)
// ----------------------------------------------------------------------
function resolveLicenseDates(incident: Incident, allCalendarDays: DayInfo[], representative?: Representative): ResolvedIncident {
  const duration = incident.duration ?? 1
  const result: ISODate[] = []

  // Simple continuous expansion
  let cursor = parseLocalDate(incident.startDate)
  for (let i = 0; i < duration; i++) {
    const currentDate = formatISO(cursor, { representation: 'date' })
    result.push(currentDate)
    cursor = addDays(cursor, 1)
  }

  const endDate = result[result.length - 1]
  // 🟢 FIX: Return date must be a real working day (respecting holidays)
  const returnDate = findNextWorkingDay(endDate, allCalendarDays, representative, false)

  return {
    incident,
    dates: result,
    start: result[0],
    end: endDate,
    returnDate
  }
}

// ----------------------------------------------------------------------
// HELPER: VACACIONES (Working Days Only)
// ----------------------------------------------------------------------
function resolveVacationDates(
  incident: Incident,
  allCalendarDays: DayInfo[],
  representative?: Representative
): ResolvedIncident {
  const duration = incident.duration ?? 14
  const result: ISODate[] = []
  const calendarMap = new Map(allCalendarDays.map(d => [d.date, d]))

  let cursor = parseLocalDate(incident.startDate)
  let consumedDays = 0
  let daysScanned = 0
  const maxDaysToScan = duration * 3 + 30 // Safety break

  while (consumedDays < duration && daysScanned < maxDaysToScan) {
    const currentDate = formatISO(cursor, { representation: 'date' })
    daysScanned++

    // Check eligibility
    let isCountable = false
    const dayInfo = calendarMap.get(currentDate)

    if (dayInfo && dayInfo.kind !== 'HOLIDAY') {
      // Not a general holiday, check rep specific schedule
      if (representative) {
        const dayOfWeek = cursor.getUTCDay()
        const isBaseOffDay = representative.baseSchedule[dayOfWeek] === 'OFF'
        if (!isBaseOffDay) {
          isCountable = true
        }
      } else {
        // No rep context? Assume working if not holiday
        isCountable = true
      }
    }

    if (isCountable) {
      result.push(currentDate)
      consumedDays++
    }

    cursor = addDays(cursor, 1)
  }

  const endDate = result[result.length - 1]
  // For vacation, logic implies return date is the next working day after the last vacation day
  const returnDate = endDate ? findNextWorkingDay(endDate, allCalendarDays, representative) : undefined

  return {
    incident,
    dates: result,
    start: result[0] ?? incident.startDate,
    end: endDate ?? incident.startDate,
    returnDate
  }
}

// ----------------------------------------------------------------------
// HELPER: Single Day Incident
// ----------------------------------------------------------------------
function resolveSingleDayIncident(incident: Incident, allCalendarDays: DayInfo[]): ResolvedIncident {
  // Usually just the start date
  // Note: Some might argue TARDANZA creates a date. 
  // Current logic: Just returns the date itself.
  const date = incident.startDate

  // For single day incidents, returnDate is typically just the next day, 
  // OR we could say "next working day". Usually incidental events don't have a "return".
  // But let's keep consistency with previous logic: simple addDays(1)
  const returnDate = formatISO(addDays(parseLocalDate(date), 1), { representation: 'date' })

  return {
    incident,
    dates: [date],
    start: date,
    end: date,
    returnDate
  }
}

// ----------------------------------------------------------------------
// SHARED UTILITY: Find Next Working Day
// ----------------------------------------------------------------------
function findNextWorkingDay(
  fromIndexDate: ISODate,
  allCalendarDays: DayInfo[],
  representative?: Representative,
  ignoreHolidays: boolean = false
): ISODate {
  const calendarMap = new Map(allCalendarDays.map(d => [d.date, d]))
  let cursor = addDays(parseLocalDate(fromIndexDate), 1)
  let found = false
  const maxSearch = 20
  let i = 0

  while (!found && i < maxSearch) {
    const dateStr = formatISO(cursor, { representation: 'date' })
    const dayInfo = calendarMap.get(dateStr)

    // Modification: If ignoreHolidays is true, we count HOLIDAY as a potential working day 
    // (provided representative base schedule allows it).
    // If ignoreHolidays is false (default), we skip HOLIDAY.

    if (dayInfo && (dayInfo.kind !== 'HOLIDAY' || ignoreHolidays)) {
      if (representative) {
        const dayOfWeek = cursor.getUTCDay()
        if (representative.baseSchedule[dayOfWeek] !== 'OFF') {
          return dateStr
        }
      } else {
        // Without rep, assume non-holiday is working
        return dateStr
      }
    }

    cursor = addDays(cursor, 1)
    i++
  }

  // Fallback if not found (unexpected)
  return formatISO(addDays(parseLocalDate(fromIndexDate), 1), { representation: 'date' })
}
