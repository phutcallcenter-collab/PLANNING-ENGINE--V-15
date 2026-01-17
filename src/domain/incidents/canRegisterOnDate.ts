'use client'
import { ISODate, IncidentType } from '../types'

type DateValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

/**
 * Business rule to determine if a specific incident type can be registered on a target date.
 * - Punitive/administrative incidents (AUSENCIA, TARDANZA, ERROR, LICENCIA) can only be registered on or before today.
 * - Planning incidents (VACACIONES) can be registered for any date (past, present, or future).
 *
 * @param type The type of the incident.
 * @param targetDate The ISO date string for the incident's start.
 * @param today The ISO date string for the current day.
 * @returns A result object indicating if the action is valid.
 */
export function canRegisterOnDate(
  type: IncidentType,
  targetDate: ISODate,
  today: ISODate
): DateValidationResult {
  const isFutureDate = targetDate > today

  if (isFutureDate) {
    // Only VACACIONES can be registered in the future.
    if (type === 'VACACIONES') {
      return { ok: true }
    } else {
      return {
        ok: false,
        code: 'CANNOT_REGISTER_IN_FUTURE',
        message: `Las incidencias de tipo "${type}" no pueden registrarse en fechas futuras.`,
      }
    }
  }

  // Any incident type can be registered for today or a past date.
  return { ok: true }
}
