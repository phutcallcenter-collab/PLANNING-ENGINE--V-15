import { SwapEvent, ISODate, ShiftType } from '../types'

/**
 * 🎯 SELECTOR PURO: Encuentra el swap que afecta a una celda específica
 * 
 * La UI NO debe saber qué swap afecta a una celda.
 * Esta función centraliza toda la lógica de detección.
 * 
 * Reglas de afectación:
 * - COVER: Afecta a fromRep Y toRep en el shift específico
 * - DOUBLE: Afecta solo al rep que hace el doble en el shift específico
 * - SWAP: Afecta a ambos reps en sus respectivos shifts (independiente del shift consultado)
 * 
 * @returns El swap que afecta la celda, o null si no existe
 */
export function getSwapForCell(
  swaps: SwapEvent[],
  params: {
    date: ISODate
    repId: string
    shift: ShiftType
  }
): SwapEvent | null {
  const { date, repId, shift } = params

  const matches: SwapEvent[] = []

  for (const swap of swaps) {
    if (swap.date !== date) continue

    let affectsCell = false

    switch (swap.type) {
      case 'COVER':
        affectsCell = 
          swap.shift === shift &&
          (swap.fromRepresentativeId === repId ||
           swap.toRepresentativeId === repId)
        break

      case 'DOUBLE':
        affectsCell =
          swap.shift === shift &&
          swap.representativeId === repId
        break

      case 'SWAP':
        affectsCell =
          swap.fromRepresentativeId === repId ||
          swap.toRepresentativeId === repId
        break
    }

    if (affectsCell) {
      matches.push(swap)
    }
  }

  // Invariante crítica: una celda solo puede ser afectada por un swap
  // Si esto falla, hay un bug en la lógica de negocio que permite
  // crear swaps conflictivos. El error debe gritar temprano.
  if (matches.length > 1) {
    throw new Error(
      `[INVARIANT VIOLATION] Multiple swaps (${matches.length}) affect the same cell: ` +
        `date=${date}, repId=${repId}, shift=${shift}. ` +
        `Swap IDs: ${matches.map((s) => s.id).join(', ')}`
    )
  }

  return matches[0] ?? null
}
