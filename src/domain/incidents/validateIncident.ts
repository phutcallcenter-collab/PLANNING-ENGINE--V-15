/**
 * ⚠️ HARDENED MODULE - FIREWALL
 *
 * @description This function is the ultimate firewall for incident creation. It enforces all
 * business rules before an incident is saved. Any changes here MUST be accompanied by a new test
 * in `validateIncident.test.ts` that justifies the modification. An OVERRIDE incident type
 * bypasses almost all rules, as its job is to modify the plan directly.
 *
 * @see validateIncident.test.ts
 */
'use client'
import type { Incident, IncidentInput, ISODate } from './types'
import { RepresentativeId } from '../representatives/types'
import { isAfter, isBefore, parseISO, format } from 'date-fns'
import { resolveIncidentDates, ResolvedIncident } from './resolveIncidentDates'
import type { DayInfo } from '../calendar/types'
import type { Representative } from '../representatives/types'
import { IncidentType } from './types'
import { canRegisterOnDate } from './canRegisterOnDate'

export type ValidationResult =
  | { ok: true; warning?: string }
  | { ok: false; code: string; message: string }

/**
 * Validates a new incident against existing ones and business rules.
 * This is the final check before saving.
 * Crucially, OVERRIDE incidents bypass most of these rules.
 */
export function validateIncident(
  newIncident: Incident,
  existingIncidents: Incident[],
  allCalendarDays: DayInfo[],
  representative: Representative,
  allRepresentatives: Representative[]
): ValidationResult {
  // Rule -1: OVERRIDE is a special planning action, not a real incident.
  // It bypasses all subsequent validation rules.
  if (newIncident.type === 'OVERRIDE') {
    return { ok: true }
  }
  
  // Rule 0: Check if the incident type can be registered on the target date.
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateRuleValidation = canRegisterOnDate(
    newIncident.type,
    newIncident.startDate,
    today
  )
  if (!dateRuleValidation.ok) {
    return {
      ok: false,
      code: dateRuleValidation.code,
      message: dateRuleValidation.message,
    }
  }

  const resolvedNewIncident = resolveIncidentDates(
    newIncident,
    allCalendarDays,
    representative
  )

  if (
    resolvedNewIncident.dates.length === 0 &&
    newIncident.type === 'VACACIONES'
  ) {
    return {
      ok: false,
      code: 'NO_WORKING_DAYS_FOR_VACATION',
      message: 'No se encontraron días laborables para iniciar las vacaciones.',
    }
  }

  if (
    resolvedNewIncident.dates.length === 0 &&
    newIncident.type === 'LICENCIA' &&
    newIncident.duration > 0
  ) {
    return {
      ok: false,
      code: 'NO_DAYS_FOR_LICENSE',
      message: 'La duración de la licencia debe ser de al menos 1 día.',
    }
  }

  const newIncidentDates = resolvedNewIncident.dates
  const existingForRep = existingIncidents.filter(
    i => i.representativeId === newIncident.representativeId
  )
  const repMap = new Map(allRepresentatives.map(r => [r.id, r]))

  // Rule 1: An AUSENCIA blocks any other incident on the same day.
  // And nothing can be added if an AUSENCIA already exists.
  if (newIncident.type !== 'AUSENCIA') {
    for (const date of newIncidentDates) {
      const hasAbsence = existingForRep.some(
        i => i.startDate === date && i.type === 'AUSENCIA'
      )
      if (hasAbsence) {
        return {
          ok: false,
          code: 'BLOCKED_BY_ABSENCE',
          message: `No se pueden registrar eventos en un día con ausencia (${date}).`,
        }
      }
    }
  }

  // Rule 2: No overlaps with existing VACACIONES or LICENCIA
  for (const existing of existingIncidents) {
    // Only check incidents for the *same representative*
    const isRelevant = existing.representativeId === newIncident.representativeId

    if (
      isRelevant &&
      existing.id !== newIncident.id &&
      (existing.type === 'VACACIONES' || existing.type === 'LICENCIA')
    ) {
      const existingRep = repMap.get(existing.representativeId)
      if (!existingRep) continue

      const existingDates = resolveIncidentDates(
        existing,
        allCalendarDays,
        existingRep
      ).dates

      const hasOverlap = newIncidentDates.some(d => existingDates.includes(d))

      if (hasOverlap) {
        const message =
          newIncident.type === 'VACACIONES' || newIncident.type === 'LICENCIA'
            ? `El rango de fechas se solapa con una ${
                existing.type === 'VACACIONES' ? 'vacación' : 'licencia'
              } existente.`
            : `El día seleccionado está cubierto por una ${
                existing.type === 'VACACIONES' ? 'vacación' : 'licencia'
              } existente.`

        return {
          ok: false,
          code: 'OVERLAP_WITH_FORMAL_INCIDENT',
          message,
        }
      }
    }
  }

  // Rule 3: No duplicate TARDANZA on the same day.
  if (newIncident.type === 'TARDANZA') {
    const hasTardy = existingForRep.some(
      i =>
        i.id !== newIncident.id &&
        i.startDate === newIncident.startDate &&
        i.type === 'TARDANZA'
    )
    if (hasTardy) {
      return {
        ok: false,
        code: 'DUPLICATE_TARDY',
        message: 'Ya existe una tardanza registrada para este día.',
      }
    }
  }

  // Rule 4: Return a warning if adding an AUSENCIA will clear other incidents.
  if (newIncident.type === 'AUSENCIA') {
    const hasOtherIncidents = existingForRep.some(
      i => i.startDate === newIncident.startDate && i.type !== 'OVERRIDE'
    )
    if (hasOtherIncidents) {
      return {
        ok: true,
        warning:
          'Registrar una ausencia en esta fecha eliminará otras incidencias existentes para este representante en el mismo día. ¿Desea continuar?',
      }
    }
  }

  return { ok: true }
}
