/**
 * @file humanize.ts
 * @purpose Canonical source for ALL human-readable copy.
 *
 * ⚠️ CRITICAL RULES:
 * - This file contains NO UI logic.
 * - This file contains NO business rules.
 * - This file MUST NEVER mention:
 *   ❌ "override"
 *   ❌ "estado"
 *   ❌ "regla"
 *   ❌ "sistema"
 *
 * ✅ CONTRACTS:
 * - UI components must not invent labels
 * - Store must not hardcode strings
 * - Domain concepts → human language happens here
 *
 * Everything here speaks in HUMAN terms:
 * people, days, situations.
 */


import type { ISODate, Representative, IncidentType, SwapEvent } from '@/domain/types'
import { format, parseISO } from 'date-fns'

// -----------------------------------------------------------------------------
// Domain concept labels
// -----------------------------------------------------------------------------

/**
 * Canonical labels for incident types.
 * Used by store notifications and UI displays.
 */
export function incidentLabel(type: IncidentType): string {
  switch (type) {
    case 'TARDANZA':
      return 'Tardanza'
    case 'AUSENCIA':
      return 'Ausencia'
    case 'ERROR':
      return 'Error'
    case 'OTRO':
      return 'Otro'
    case 'VACACIONES':
      return 'Vacaciones'
    case 'LICENCIA':
      return 'Licencia'
    case 'OVERRIDE':
      return 'Cambio de turno'
    default:
      return 'Incidencia'
  }
}

/**
 * Human-readable description for swap/coverage events.
 * Used in history, audit, and undo operations.
 * Copy humano, sin jerga técnica.
 */
export function swapDescription(
  swap: SwapEvent,
  representatives: Representative[]
): string {
  const getName = (id?: string) =>
    representatives.find(r => r.id === id)?.name ?? '—'

  switch (swap.type) {
    case 'COVER':
      return `${getName(swap.toRepresentativeId)} cubre a ${getName(
        swap.fromRepresentativeId
      )}`

    case 'DOUBLE':
      return `${getName(swap.representativeId)} realiza doble turno`

    case 'SWAP':
      return `${getName(swap.fromRepresentativeId)} intercambia turno con ${getName(
        swap.toRepresentativeId
      )}`

    default:
      return 'Movimiento de turno registrado'
  }
}


// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function repName(
  representatives: Representative[],
  id?: string | null
): string {
  if (!id) return '—'
  return representatives.find(r => r.id === id)?.name ?? '—'
}

function formatDate(date: ISODate): string {
  return format(parseISO(date), 'dd/MM')
}

// -----------------------------------------------------------------------------
// Base working states
// -----------------------------------------------------------------------------

export function workingBaseTooltip(
  rep: Representative,
  date: ISODate
): string {
  return `${rep.name} trabaja normalmente este día.`
}

export function workingHolidayTooltip(
  rep: Representative,
  holidayName?: string
): string {
  return `${rep.name} trabaja en feriado${holidayName ? ` (${holidayName})` : ''
    }. Este día se compensa fuera del planner.`
}

// -----------------------------------------------------------------------------
// Absences & planned time off
// -----------------------------------------------------------------------------

export function absentTooltip(
  rep: Representative,
  date: ISODate,
  note?: string
): string {
  if (note && note.trim().length > 0) {
    return `${rep.name} estuvo ausente. Motivo: ${note}.`
  }
  return `${rep.name} debía trabajar este día pero no se presentó.`
}

export function offBaseTooltip(rep: Representative): string {
  return `Día libre habitual de ${rep.name}.`
}

export function vacationTooltip(
  rep: Representative,
  from: ISODate,
  to: ISODate
): string {
  return `${rep.name} está de vacaciones del ${formatDate(from)} al ${formatDate(
    to
  )}.`
}

export function licenseTooltip(
  rep: Representative,
  from: ISODate,
  to: ISODate
): string {
  return `${rep.name} está de licencia del ${formatDate(from)} al ${formatDate(
    to
  )}.`
}

// -----------------------------------------------------------------------------
// Coverage, swaps & load changes
// -----------------------------------------------------------------------------

export function coveringTooltip(
  actor: Representative,
  target: Representative,
  shiftLabel: string
): string {
  return `${actor.name} cubre a ${target.name} (${shiftLabel}).`
}

export function coveredTooltip(
  target: Representative,
  actor: Representative,
  shiftLabel: string
): string {
  return `${target.name} está cubierto por ${actor.name} (${shiftLabel}).`
}

export function doubleTooltip(
  rep: Representative,
  shiftLabel: string
): string {
  return `${rep.name} realiza doble turno (${shiftLabel}). Carga adicional de trabajo.`
}

export function swappedOutTooltip(
  rep: Representative,
  actor: Representative,
  shiftLabel: string
): string {
  return `${rep.name} intercambió turno con ${actor.name} (${shiftLabel}).`
}
