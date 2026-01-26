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

import { ISODate, ShiftType, WeeklyPlan, SwapEvent, Incident, RepresentativeId, Representative, SpecialSchedule } from '../types'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { DayInfo } from '../calendar/types'
import { getEffectiveSchedule } from '@/application/scheduling/specialScheduleAdapter'

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
  specialSchedules: SpecialSchedule[] = []
): EffectiveDutyResult {
  // ===============================================
  // 0. OVERRIDE INCIDENTS: Manual changes to assignments
  // ===============================================
  // Overrides are manual interventions that MUST take precedence over everything else,
  // including Special Schedules (Effective Periods).
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
  // 1. CANONICAL SCHEDULING ADAPTER (Base + Special Schedules)
  // ===============================================
  // Replaces both Priority 1 (EffectivePeriod) and Priority 2 (Base Plan) old logic.
  // The adapter respects Precedence: Individual Special > Global Special > Base.
  const representative = representatives.find(r => r.id === representativeId)
  if (!representative) {
    // Fallback / Error handling
    return { shouldWork: false, role: 'NONE', reason: 'Representative not found' }
  }

  const effective = getEffectiveSchedule({
    representative,
    dateStr: date,
    baseSchedule: representative.baseSchedule,
    specialSchedules
  })

  // We need to determine "Planned Duty" before checking incidents.
  let plannedRole: EffectiveDutyRole = 'NONE'
  let plannedShouldWork = false
  let adapterSource: EffectiveDutyResult['source'] = 'BASE'
  let adapterReason: string | undefined = undefined

  if (effective.type === 'OFF') {
    plannedShouldWork = false
    plannedRole = 'NONE'
    adapterSource = effective.source ? 'EFFECTIVE_PERIOD' : 'BASE'
    adapterReason = effective.source?.note || 'Día libre'
  } else if (effective.type === 'MIXTO' || effective.type === 'BASE' || effective.type === 'OVERRIDE') {
    // If working, does it match the requested shift?
    adapterSource = effective.source ? 'EFFECTIVE_PERIOD' : 'BASE'
    adapterReason = effective.source?.note

    if (effective.type === 'MIXTO') {
      plannedShouldWork = true
      plannedRole = 'BASE'
      // ⚠️ SEMANTIC NOTE: 'BASE' role here is correct because MIXTO isn't a separate job.
      // It just means they are working their base day, but are eligible for swaps/covers in other shifts.
    } else {
      // Specific shift
      const matchesRequest = effective.shift === shift
      plannedShouldWork = matchesRequest
      plannedRole = matchesRequest ? 'BASE' : 'NONE'
    }
  }

  // Precedence Note:
  // We calculate the "Planned State" first via the Adapter (Base + Special).
  // Then we verify availability via Incident blocks (Priority 3).
  // This ensures VACATIONS always override any schedule (even Special),
  // aligning with the "OFF mata todo" rule for formal incidents.

  // Continue to check Incidents...

  // ===============================================
  // 3. INCIDENCIAS BLOQUEANTES: Verificar disponibilidad
  // ===============================================
  // representative already found in step 1
  // const representative = representatives.find(r => r.id === representativeId)

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

    // License is strictly Calendar Days, already expanded in resolved.dates
    // We should NOT bridge the gap to returnDate visually, as that creates "ghost" days
    // on OFF days that are past the license duration.

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

  // 🛡️ GUARD: Absence vs Planned Schedule (Adapter)
  if (absenceIncident && plannedShouldWork) {
    return {
      shouldWork: false, // Although planned, didn't work
      role: 'NONE',
      reason: 'AUSENCIA',
      source: 'INCIDENT',
      details: absenceIncident.details,
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
  // 5. FALLBACK: Usar resultado del Adapter
  // ===============================================
  // If no other event intervened, return the calculated scheduled state.
  return {
    shouldWork: plannedShouldWork,
    role: plannedRole,
    source: adapterSource,
    reason: adapterReason
  }
}
