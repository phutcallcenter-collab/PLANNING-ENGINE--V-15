/**
 * 🔒 VALIDACIÓN DE OPERACIONES DE CAMBIO DE TURNO
 *
 * Refactorizado para usar el CONTEXTO EFECTIVO (EffectiveSwapContext).
 * La validación se basa en la disponibilidad real y los bloqueos duros.
 */

import { SwapType, ShiftType } from '../types'
import { EffectiveSwapContext } from './buildDailyEffectiveContext'

export type ValidationError = string | null

/**
 * Helper: Verifica si el set de turnos efectivos contiene el turno
 */
function hasShift(shifts: Set<ShiftType> | undefined, shift: ShiftType): boolean {
  return shifts ? shifts.has(shift) : false
}

/**
 * 🎯 VALIDACIÓN DE OPERACIONES DE SWAP
 * 
 * Utiliza EffectiveSwapContext como fuente de verdad.
 */
export function validateSwapOperation(
  type: SwapType,
  fromId: string | undefined,
  toId: string | undefined,
  shift: ShiftType,
  ctx: EffectiveSwapContext
): ValidationError {
  const get = (id?: string) => (id ? ctx.daily[id] : undefined)

  // ======================
  // Reglas generales de IDs
  // ======================
  if (type === 'COVER' || type === 'SWAP') {
    if (!fromId || !toId) return null // Aún no seleccionados
    if (fromId === toId) {
      return 'La operación requiere dos personas distintas.'
    }
  }

  if (type === 'DOUBLE') {
    if (!toId) return null
  }

  const from = get(fromId)
  const to = get(toId)

  // ======================
  // COVER
  // ======================
  if (type === 'COVER') {
    if (!from || !to) return 'Representante inválido.'

    // 1. Bloqueos duros (Vacaciones/Licencia)
    // Nota: Aunque técnicamente podríamos cubrir a alguien ausente,
    // si el sistema marca bloqueo (isBlocked), es Vacaciones/Licencia.
    // Generalmente esto impide la operación "COVER" (reemplazo de turno).
    if (from.isBlocked) return 'No se puede cubrir a alguien de vacaciones o licencia.'
    if (to.isBlocked) return 'No se puede cubrir con alguien de vacaciones o licencia.'

    // 2. El cubierto (from) debe tener el turno asignado (Efectivo)
    // Esto incluye si falta, pero el turno sigue siendo suyo hasta que se cubra.
    // Si NO tiene el turno en su estado efectivo, no hay nada que cubrir.
    if (!hasShift(from.effectiveShifts, shift)) {
      return 'El representante no tiene ese turno asignado para ser cubierto.'
    }

    // 3. El que cubre (to) debe estar LIBRE en ese turno
    if (hasShift(to.effectiveShifts, shift)) {
      return 'El representante que cubre no está disponible en ese horario.'
    }

    return null
  }

  // ======================
  // SWAP
  // ======================
  if (type === 'SWAP') {
    if (!from || !to) return 'Representante inválido.'

    if (from.isBlocked || to.isBlocked) {
      return 'No se puede intercambiar con alguien de vacaciones o licencia.'
    }

    // Para SWAP, necesitamos saber QUÉ turnos estamos intercambiando.
    // La función recibe 'shift', pero en un SWAP real, 'shift' es ambiguo 
    // si no especificamos qué turno da quién.
    // Asumimos que la validación aquí es general.
    // Verificamos si ambos tienen ALGÚN turno.
    if (from.effectiveShifts.size === 0 || to.effectiveShifts.size === 0) {
      return 'Ambos representantes deben tener turnos asignados para intercambiar.'
    }

    // Si ambos tienen exactamente el MISMO turno único, no tiene sentido.
    if (from.effectiveShifts.size === 1 && to.effectiveShifts.size === 1) {
      const fromShift = Array.from(from.effectiveShifts)[0]
      const toShift = Array.from(to.effectiveShifts)[0]
      if (fromShift === toShift) {
        return 'El intercambio no tiene efecto: ambos trabajan el mismo turno.'
      }
    }

    // Nota: La lógica de SWAP perfecta requiere saber "FromShift" y "ToShift" exactos.
    // Pero en esta validación simplificada verificamos condiciones básicas.

    return null
  }

  // ======================
  // DOUBLE
  // ======================
  if (type === 'DOUBLE') {
    if (!to) return 'Representante inválido.'

    if (to.isBlocked) {
      return 'No se puede asignar doble turno a alguien de vacaciones o licencia.'
    }

    // Ya trabaja ese turno?
    if (hasShift(to.effectiveShifts, shift)) {
      return 'El representante ya trabaja ese turno.'
    }

    return null
  }

  return 'Operación no válida.'
}
