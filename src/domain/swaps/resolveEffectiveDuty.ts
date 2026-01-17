/**
 * 🎯 RESOLUCIÓN DEL ESTADO EFECTIVO DE DUTY
 *
 * Este módulo determina el rol efectivo de un representante en un día/turno específico,
 * considerando el plan base, incidencias y eventos de swap.
 *
 * ORDEN DE PRECEDENCIA (CRITICAL - DO NOT REORDER):
 * 1. EffectiveSchedulePeriod (PRIORIDAD ABSOLUTA - reemplaza TODO)
 * 2. Plan base (WeeklyPlan)
 * 3. Incidencias bloqueantes (VACACIONES, LICENCIA)
 * 4. Swaps/Covers/Doubles (eventos operacionales)
 *
 * Ver SWAP_RULES.md para reglas completas.
 */

import { ISODate, ShiftType, WeeklyPlan, SwapEvent, Incident, RepresentativeId, Representative, EffectiveSchedulePeriod } from '../types'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { DayInfo } from '../calendar/types'
import { findActiveEffectivePeriod, getDutyFromPeriod } from '../planning/effectivePeriodHelpers'

export type EffectiveDutyRole =
  | 'BASE' // Trabaja según plan base, sin modificaciones
  | 'COVERING' // Cubre a alguien (entra a reemplazar)
  | 'COVERED' // Es cubierto (sale del turno)
  | 'DOUBLE' // Hace turno adicional (suma a su carga)
  | 'SWAPPED_IN' // Trabaja por intercambio (entra al turno por SWAP)
  | 'SWAPPED_OUT' // No trabaja por intercambio (sale del turno por SWAP)
  | 'NONE' // No trabaja (OFF, ausencia, etc.)

export interface EffectiveDutyResult {
  shouldWork: boolean
  role: EffectiveDutyRole
  reason?: string // Semantic reason e.g., VACACIONES, AUSENCIA
  partnerId?: RepresentativeId // The other person in the transaction
  source?: 'BASE' | 'OVERRIDE' | 'EFFECTIVE_PERIOD' | 'INCIDENT' | 'SWAP'
  note?: string
  details?: string
}



export function resolveEffectiveDuty(
  weeklyPlan: WeeklyPlan,
  swaps: SwapEvent[],
  incidents: Incident[],
  date: ISODate,
  shift: ShiftType,
  representativeId: string,
  allCalendarDays: DayInfo[],
  representatives: Representative[],
  effectivePeriods: EffectiveSchedulePeriod[] = []
): EffectiveDutyResult {
  // ===============================================
  // 1. EFFECTIVE SCHEDULE PERIOD: ABSOLUTE PRIORITY
  // ===============================================
  const activePeriod = findActiveEffectivePeriod(effectivePeriods, representativeId, date)

  if (activePeriod) {
    const duty = getDutyFromPeriod(activePeriod, date)
    const isOverride = activePeriod.startDate === activePeriod.endDate
    const source = isOverride ? 'OVERRIDE' : 'EFFECTIVE_PERIOD'
    const note = activePeriod.note

    // Map DailyDuty to EffectiveDutyResult
    if (duty === 'OFF') {
      return {
        shouldWork: false,
        role: 'NONE',
        reason: activePeriod.reason || (isOverride ? 'Día libre asignado manualmente' : 'Período de horario especial'),
        source,
        note,
      }
    }

    if (duty === 'BOTH') {
      return {
        shouldWork: true,
        role: 'BASE',
        reason: activePeriod.reason,
        source,
        note,
      }
    }

    if (duty === 'DAY' || duty === 'NIGHT') {
      const shouldWork = duty === shift
      return {
        shouldWork,
        role: shouldWork ? 'BASE' : 'NONE',
        reason: activePeriod.reason,
        source,
        note,
      }
    }
  }

  // ===============================================
  // 1.5. OVERRIDE INCIDENTS: Manual changes to assignments
  // ===============================================
  // Overrides are manual interventions that should take precedence over base plan
  // but potentially be blocked by vacations? No, usually override implies "I know what I'm doing".
  // However, the system UI creates overrides to set days OFF or ON.
  // If we have an override for this date, we respect it ABOVE the base plan.

  const overrideIncident = incidents.find(i =>
    i.representativeId === representativeId &&
    i.type === 'OVERRIDE' &&
    i.startDate === date
  )

  if (overrideIncident && overrideIncident.assignment) {
    const assignment = overrideIncident.assignment
    let overrideRole: EffectiveDutyRole = 'NONE'
    let shouldWork = false

    if (assignment.type === 'BOTH') {
      shouldWork = true
      overrideRole = 'BASE' // Or 'OVERRIDE_WORK'? keeping 'BASE' for now as it means "working standard"
    } else if (assignment.type === 'SINGLE') {
      shouldWork = assignment.shift === shift
      overrideRole = shouldWork ? 'BASE' : 'NONE'
    } else {
      // OFF
      shouldWork = false
      overrideRole = 'NONE'
    }

    // If it matches properly, return it.
    // Note: We return context to help tooltip
    return {
      shouldWork,
      role: overrideRole,
      reason: 'Manual Override',
      source: 'OVERRIDE',
      note: overrideIncident.note
    }
  }

  // ===============================================
  // 2. PLAN BASE: Determinar asignación original
  // ===============================================
  const agent = weeklyPlan.agents.find(
    a => a.representativeId === representativeId
  )
  const baseAssignment = agent?.days[date]?.assignment

  const baseWorks =
    baseAssignment?.type === 'BOTH' ||
    (baseAssignment?.type === 'SINGLE' && baseAssignment.shift === shift)

  // ===============================================
  // 3. INCIDENCIAS BLOQUEANTES: Verificar disponibilidad
  // ===============================================
  const representative = representatives.find(r => r.id === representativeId)

  // 🔒 DEFENSIVE: Si no encontramos el representante, algo está mal
  if (!representative) {
    console.warn(
      `[resolveEffectiveDuty] Representative ${representativeId} not found. This may cause incorrect vacation calculations.`
    )
  }

  const blockingIncident = incidents.find(i => {
    if (i.representativeId !== representativeId) return false
    if (!['VACACIONES', 'LICENCIA'].includes(i.type)) return false

    const resolved = resolveIncidentDates(
      i,
      allCalendarDays,
      representative // Puede ser undefined, pero resolveIncidentDates tiene fallback
    )

    if (resolved.dates.includes(date)) return true

    if (i.type === 'VACACIONES' && resolved.start && resolved.returnDate) {
      if (date >= resolved.start && date < resolved.returnDate) {
        return true
      }
    }

    if (i.type === 'LICENCIA' && resolved.start && resolved.returnDate) {
      if (date >= resolved.start && date < resolved.returnDate) {
        return true
      }
    }

    return false
  })

  if (blockingIncident) {
    return {
      shouldWork: false,
      role: 'NONE',
      reason: blockingIncident.type,
      source: 'INCIDENT',
    }
  }

  const absenceIncident = incidents.find(i => {
    if (i.representativeId !== representativeId) return false
    if (i.type !== 'AUSENCIA') return false

    const resolved = resolveIncidentDates(
      i,
      allCalendarDays,
      representative
    )
    return resolved.dates.includes(date)
  })

  if (absenceIncident && baseWorks) {
    return {
      shouldWork: false, // Although planned, didn't work
      role: 'NONE',
      reason: 'AUSENCIA',
      source: 'INCIDENT',
      details: absenceIncident.details, // Propagate details (e.g., 'JUSTIFICADA')
      note: absenceIncident.note,
    }
  }

  // ===============================================
  // 4. EVENTOS DE SWAP: Aplicar modificaciones
  // ===============================================
  const relevantSwaps = swaps.filter(s => s.date === date)

  for (const s of relevantSwaps) {
    if (s.type === 'COVER' && s.shift === shift) {
      if (s.fromRepresentativeId === representativeId) {
        return {
          shouldWork: false,
          role: 'COVERED',
          reason: `Cubierto por ${s.toRepresentativeId}`,
          source: 'SWAP',
        }
      }
      if (s.toRepresentativeId === representativeId) {
        return {
          shouldWork: true,
          role: 'COVERING',
          reason: `Cubriendo a ${s.fromRepresentativeId}`,
          source: 'SWAP',
        }
      }
    }

    if (s.type === 'DOUBLE' && s.shift === shift) {
      if (s.representativeId === representativeId) {
        return { shouldWork: true, role: 'DOUBLE', reason: 'Turno adicional', source: 'SWAP' }
      }
    }

    if (s.type === 'SWAP') {
      if (s.fromRepresentativeId === representativeId) {
        if (s.fromShift === shift) {
          return {
            shouldWork: false,
            role: 'SWAPPED_OUT',
            reason: `Intercambio con ${s.toRepresentativeId}`,
            source: 'SWAP',
          }
        }
        if (s.toShift === shift) {
          return {
            shouldWork: true,
            role: 'SWAPPED_IN',
            reason: `Intercambio con ${s.toRepresentativeId}`,
            source: 'SWAP',
          }
        }
      }
      if (s.toRepresentativeId === representativeId) {
        if (s.toShift === shift) {
          return {
            shouldWork: false,
            role: 'SWAPPED_OUT',
            reason: `Intercambio con ${s.fromRepresentativeId}`,
            source: 'SWAP',
          }
        }
        if (s.fromShift === shift) {
          return {
            shouldWork: true,
            role: 'SWAPPED_IN',
            reason: `Intercambio con ${s.fromRepresentativeId}`,
            source: 'SWAP',
          }
        }
      }
    }
  }

  // ===============================================
  // 5. FALLBACK: Usar plan base
  // ===============================================
  if (baseWorks) {
    return { shouldWork: true, role: 'BASE', source: 'BASE' }
  }

  return { shouldWork: false, role: 'NONE', source: 'BASE' }
}
