'use client'
import { addDays, parseISO, formatISO, isValid } from 'date-fns'
import type { Incident, Representative } from '../types'
import type { DayInfo, ISODate } from '../calendar/types'

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
 * - 'VACACIONES': Counts a fixed number of 'WORKING' days (14), skipping holidays and base schedule OFF days.
 * - Other incidents: Have a duration of 1 day.
 *
 * @param incident The incident to resolve.
 * @param allCalendarDays A (potentially large) array of DayInfo objects, must contain all days needed.
 * @param representative The specific representative, needed to check their base schedule for vacations.
 * @returns An object with the original incident, an array of affected ISO dates, and start/end dates.
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

  const result: ISODate[] = []

  // For VACACIONES, duration defaults to 14 working days but can be overridden. For others, use provided duration or default to 1.
  const duration = incident.type === 'VACACIONES'
    ? (incident.duration ?? 14)
    : (incident.duration ?? 1)

  if (duration <= 0) {
    return {
      incident,
      dates: [],
      start: incident.startDate,
      end: incident.startDate,
    }
  }

  const calendarMap = new Map(allCalendarDays.map(d => [d.date, d]))
  let cursor = parseISO(incident.startDate)
  let consumedDays = 0
  // Heuristic to prevent infinite loops in case of misconfiguration (e.g., rep with no working days)
  const maxDaysToScan = duration * 3 + 30
  let daysScanned = 0

  while (consumedDays < duration && daysScanned < maxDaysToScan) {
    const currentDate = formatISO(cursor, { representation: 'date' })
    const dayInfo = calendarMap.get(currentDate)
    daysScanned++

    let isCountableDay = false

    switch (incident.type) {
      case 'LICENCIA':
        // Licenses count every single calendar day, no exceptions.
        isCountableDay = true
        break

      case 'VACACIONES':
        // Vacations only count 'WORKING' days and skip HOLIDAYS and base schedule OFF days.
        if (dayInfo) {
          let isWorkingDay = dayInfo.kind !== 'HOLIDAY'

          if (representative) {
            const dayOfWeek = cursor.getUTCDay()
            const isBaseOffDay = representative.baseSchedule[dayOfWeek] === 'OFF'
            isWorkingDay = isWorkingDay && !isBaseOffDay
          }
          isCountableDay = isWorkingDay
        }
        break

      default:
        // All other incidents are single-day events.
        if (result.length === 0) {
          isCountableDay = true
        }
        break
    }

    if (isCountableDay) {
      result.push(currentDate)
      consumedDays++
    }

    // For single-day incidents, we stop after finding the first countable day.
    if (incident.type !== 'LICENCIA' && incident.type !== 'VACACIONES' && consumedDays === 1) {
      break
    }

    cursor = addDays(cursor, 1)
  }

  const endDate = result[result.length - 1]
  let returnDate: ISODate | undefined = undefined

  if (endDate && (incident.type === 'VACACIONES' || incident.type === 'LICENCIA')) {
    // La fecha de retorno debe ser el PRIMER día WORKING después de las vacaciones/licencias
    let returnCursor = addDays(parseISO(endDate), 1)
    const maxReturnScan = 14 // Máximo 2 semanas para encontrar día de retorno

    for (let i = 0; i < maxReturnScan; i++) {
      const candidateDate = formatISO(returnCursor, { representation: 'date' })
      const dayInfo = calendarMap.get(candidateDate)

      // Verificar si es un día trabajable
      let isWorkingDay = false

      if (dayInfo?.kind !== 'HOLIDAY') {
        if (representative) {
          const dayOfWeek = returnCursor.getUTCDay()
          const isBaseOffDay = representative.baseSchedule[dayOfWeek] === 'OFF'
          isWorkingDay = !isBaseOffDay
        } else {
          isWorkingDay = true;
        }
      }

      if (isWorkingDay) {
        returnDate = candidateDate
        break
      }

      returnCursor = addDays(returnCursor, 1)
    }
  } else if (endDate) {
    // Para otros tipos de incidencias, simplemente el día siguiente
    returnDate = formatISO(addDays(parseISO(endDate), 1), {
      representation: 'date',
    })
  }

  return {
    incident,
    dates: result,
    start: result[0] ?? incident.startDate,
    end: endDate ?? incident.startDate,
    returnDate,
  }
}
