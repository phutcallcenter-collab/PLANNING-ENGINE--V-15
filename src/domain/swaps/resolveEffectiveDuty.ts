/**
 * 🎯 RESOLUCIÓN DEL ESTADO EFECTIVO DE DUTY
 *
 * Este módulo determina el rol efectivo de un representante en un día/turno específico,
 * considerando el plan base, incidencias y eventos de swap.
 *
 * ORDEN DE PRECEDENCIA (CRITICAL - DO NOT REORDER):
 * 1. EffectiveSchedulePeriod (PRIORIDAD ABSOLUTA - reemplaza TODO)
 * 2. Plan base (WeeklyPlan)
 * 3. Incidencias bloqueantes (VACACIONES, LICENCIA, AUSENCIA_JUSTIFICADA)
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
  // If an EffectiveSchedulePeriod is active, it REPLACES everything else.
  // No base plan, no mixProfile, no special schedules - ONLY the period pattern.
  const activePeriod = findActiveEffectivePeriod(effectivePeriods, representativeId, date)

  if (activePeriod) {
    const duty = getDutyFromPeriod(activePeriod, date)

    // Map DailyDuty to EffectiveDutyResult
    if (duty === 'OFF') {
      return {
        shouldWork: false,
        role: 'NONE',
        reason: activePeriod.reason || 'Período de horario especial',
      }
    }

    if (duty === 'BOTH') {
      // Works both shifts
      return {
        shouldWork: true,
        role: 'BASE',
        reason: activePeriod.reason,
      }
    }

    if (duty === 'DAY' || duty === 'NIGHT') {
      // Works specific shift
      const shouldWork = duty === shift
      return {
        shouldWork,
        role: shouldWork ? 'BASE' : 'NONE',
        reason: activePeriod.reason,
      }
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
    if (!['VACACIONES', 'LICENCIA', 'AUSENCIA_JUSTIFICADA'].includes(i.type)) return false

    const resolved = resolveIncidentDates(
      i,
      allCalendarDays,
      representative // Puede ser undefined, pero resolveIncidentDates tiene fallback
    )

    // 🔒 COMPREHENSIVE BLOCKING LOGIC
    // Block if the date is:
    // 1. Explicitly in the vacation dates list (working days counted)
    if (resolved.dates.includes(date)) return true

    // 2. Within the vacation period but not counted (holidays, gaps)
    // We block from start until the day BEFORE returnDate
    if (i.type === 'VACACIONES' && resolved.start && resolved.returnDate) {
      if (date >= resolved.start && date < resolved.returnDate) {
        // This day is within the vacation period, block it
        return true
      }
    }

    // Same logic for LICENCIA
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
        }
      }
      if (s.toRepresentativeId === representativeId) {
        return {
          shouldWork: true,
          role: 'COVERING',
          reason: `Cubriendo a ${s.fromRepresentativeId}`,
        }
      }
    }

    if (s.type === 'DOUBLE' && s.shift === shift) {
      if (s.representativeId === representativeId) {
        return { shouldWork: true, role: 'DOUBLE', reason: 'Turno adicional' }
      }
    }

    if (s.type === 'SWAP') {
      if (s.fromRepresentativeId === representativeId) {
        if (s.fromShift === shift) {
          return {
            shouldWork: false,
            role: 'SWAPPED_OUT',
            reason: `Intercambio con ${s.toRepresentativeId}`,
          }
        }
        if (s.toShift === shift) {
          return {
            shouldWork: true,
            role: 'SWAPPED_IN',
            reason: `Intercambio con ${s.toRepresentativeId}`,
          }
        }
      }
      if (s.toRepresentativeId === representativeId) {
        if (s.toShift === shift) {
          return {
            shouldWork: false,
            role: 'SWAPPED_OUT',
            reason: `Intercambio con ${s.fromRepresentativeId}`,
          }
        }
        if (s.fromShift === shift) {
          return {
            shouldWork: true,
            role: 'SWAPPED_IN',
            reason: `Intercambio con ${s.fromRepresentativeId}`,
          }
        }
      }
    }
  }

  // ===============================================
  // 5. FALLBACK: Usar plan base
  // ===============================================
  if (baseWorks) {
    return { shouldWork: true, role: 'BASE' }
  }

  return { shouldWork: false, role: 'NONE' }
}
