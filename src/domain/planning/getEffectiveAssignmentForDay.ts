import { ShiftType, ISODate } from '../calendar/types'
import { SwapEvent } from '../types'

/**
 * ⚠️ CRITICAL DOMAIN RULE
 * 
 * Calculates what shift a representative is ACTUALLY working on a given day,
 * including all swap overlays.
 * 
 * Base assignment + Swap overlays = Effective assignment
 * 
 * Returns:
 * - 'DAY' | 'NIGHT' if the rep is working that shift
 * - 'OFF' if the rep is not working
 * - null if base assignment unknown (no data)
 * 
 * INVARIANT ENFORCED:
 * A representative may have AT MOST ONE effective shift per day.
 * 
 * Used for:
 * - Validating new swaps (prevent double-booking)
 * - UI display (show actual assignment)
 * - Coverage calculations
 */
export function getEffectiveAssignmentForDay(params: {
  date: ISODate
  repId: string
  baseAssignment: ShiftType | 'OFF' | null
  swaps: SwapEvent[]
}): ShiftType | 'OFF' | null {
  const { date, repId, baseAssignment, swaps } = params

  // Sin base, no hay información
  if (baseAssignment === null) {
    return null
  }

  // Empezar con el base
  let effective: ShiftType | 'OFF' = baseAssignment

  // Aplicar swaps del día en orden
  const relevantSwaps = swaps.filter((s) => s.date === date)

  for (const swap of relevantSwaps) {
    if (swap.type === 'COVER') {
      // fromRep deja de trabajar ese turno
      if (swap.fromRepresentativeId === repId && effective === swap.shift) {
        effective = 'OFF'
      }
      // toRep empieza a trabajar ese turno
      if (swap.toRepresentativeId === repId && effective === 'OFF') {
        effective = swap.shift
      }
    } else if (swap.type === 'DOUBLE') {
      // El rep trabaja turno adicional
      if (swap.representativeId === repId) {
        // Si estaba OFF, ahora trabaja el shift
        if (effective === 'OFF') {
          effective = swap.shift
        }
        // Si ya trabajaba otro turno, esto es un problema
        // (detectado por validación previa)
      }
    } else if (swap.type === 'SWAP') {
      // Intercambio de turnos
      if (swap.fromRepresentativeId === repId) {
        if (effective === swap.fromShift) {
          effective = swap.toShift
        }
      }
      if (swap.toRepresentativeId === repId) {
        if (effective === swap.toShift) {
          effective = swap.fromShift
        }
      }
    }
  }

  return effective
}
