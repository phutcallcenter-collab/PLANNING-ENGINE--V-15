import { SwapEvent, ShiftType, ISODate, Representative } from '../types'
import { getEffectiveAssignmentForDay } from '../planning/getEffectiveAssignmentForDay'

/**
 * ⚠️ DOMAIN VALIDATION
 * 
 * Validates that a proposed swap does not violate the fundamental invariant:
 * "A representative may have at most ONE effective shift assignment per day"
 * 
 * This prevents physically impossible scenarios like:
 * - Rep working DAY and NIGHT simultaneously
 * - Multiple overlapping shift assignments
 * - Double-booking conflicts
 * 
 * @throws Error if the swap would violate the one-shift-per-day invariant
 */
export function validateSwapDoesNotCauseConflict(params: {
  proposedSwap: SwapEvent
  allSwaps: SwapEvent[]
  getBaseAssignment: (repId: string, date: ISODate) => ShiftType | 'OFF' | null
  representatives: Representative[]
}): void {
  const { proposedSwap, allSwaps, getBaseAssignment, representatives } = params

  // Helper para obtener nombre del rep
  const getRepName = (repId: string): string => {
    const rep = representatives.find(r => r.id === repId)
    return rep?.name || repId
  }

  // Helper para humanizar shift
  const getShiftName = (shift: ShiftType | 'OFF' | null): string => {
    if (shift === 'DAY') return 'Día'
    if (shift === 'NIGHT') return 'Noche'
    if (shift === 'OFF') return 'libre'
    return 'desconocido'
  }

  // Identificar qué reps se ven afectados por este swap
  const affectedReps = getAffectedReps(proposedSwap)

  // Para cada rep afectado, validar que no termine con asignación doble
  for (const repId of affectedReps) {
    const baseAssignment = getBaseAssignment(repId, proposedSwap.date)

    // Calcular asignación efectiva DESPUÉS del swap propuesto
    const effectiveAfterSwap = getEffectiveAssignmentForDay({
      date: proposedSwap.date,
      repId,
      baseAssignment,
      swaps: [...allSwaps, proposedSwap], // Incluir el swap propuesto
    })

    // Validar que la asignación sea consistente
    // (La función getEffectiveAssignmentForDay debe retornar un solo turno o OFF)
    
    // Validación adicional: detectar si el swap crea conflicto con otro swap existente
    const effectiveBeforeSwap = getEffectiveAssignmentForDay({
      date: proposedSwap.date,
      repId,
      baseAssignment,
      swaps: allSwaps,
    })

    // Si el swap propuesto intenta cambiar a alguien que ya tiene un turno diferente
    // por el swap, eso es conflicto
    if (proposedSwap.type === 'COVER') {
      // toRep debe estar OFF para poder cubrir
      if (proposedSwap.toRepresentativeId === repId && effectiveBeforeSwap !== 'OFF') {
        throw new Error(
          `${getRepName(repId)} ya tiene asignado el turno de ${getShiftName(effectiveBeforeSwap)} ese día y no puede cubrir otro turno.`
        )
      }
    } else if (proposedSwap.type === 'DOUBLE') {
      // Rep debe estar OFF para poder doblar turno
      if (proposedSwap.representativeId === repId && effectiveBeforeSwap !== 'OFF') {
        throw new Error(
          `${getRepName(repId)} ya tiene asignado el turno de ${getShiftName(effectiveBeforeSwap)} ese día y no puede hacer un turno doble.`
        )
      }
    } else if (proposedSwap.type === 'SWAP') {
      // Ambos reps deben estar en los turnos que dicen intercambiar
      if (proposedSwap.fromRepresentativeId === repId) {
        if (effectiveBeforeSwap !== proposedSwap.fromShift) {
          throw new Error(
            `${getRepName(repId)} tiene asignado ${getShiftName(effectiveBeforeSwap)}, no ${getShiftName(proposedSwap.fromShift)}. No se puede intercambiar.`
          )
        }
      }
      if (proposedSwap.toRepresentativeId === repId) {
        if (effectiveBeforeSwap !== proposedSwap.toShift) {
          throw new Error(
            `${getRepName(repId)} tiene asignado ${getShiftName(effectiveBeforeSwap)}, no ${getShiftName(proposedSwap.toShift)}. No se puede intercambiar.`
          )
        }
      }
    }
  }
}

/**
 * Helper: Identifica qué representantes son afectados por un swap
 */
function getAffectedReps(swap: SwapEvent): string[] {
  if (swap.type === 'COVER') {
    return [swap.fromRepresentativeId, swap.toRepresentativeId]
  } else if (swap.type === 'DOUBLE') {
    return [swap.representativeId]
  } else if (swap.type === 'SWAP') {
    return [swap.fromRepresentativeId, swap.toRepresentativeId]
  }
  return []
}
