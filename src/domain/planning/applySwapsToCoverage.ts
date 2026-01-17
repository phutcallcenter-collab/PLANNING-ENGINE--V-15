import { DailyShiftCoverage } from './dailyCoverage'
import { SwapEvent } from './swap'

/**
 * Applies swaps to coverage counts.
 * 
 * IMPORTANT: Swaps are 1:1 exchanges, they do NOT change total coverage.
 * - COVER: Person A stops working (-1), Person B starts working (+1). Net: 0
 * - SWAP: Exchange shifts. Net: 0 for both shifts
 * - DOUBLE: Not handled here (should be in base coverage already)
 * 
 * This function returns a NEW object (immutable).
 */
export function applySwapsToCoverage(
  baseCoverage: DailyShiftCoverage,
  swaps: SwapEvent[]
): DailyShiftCoverage {
  // Clone to ensure immutability
  const result: DailyShiftCoverage = {
    date: baseCoverage.date,
    shifts: {
      DAY: baseCoverage.shifts.DAY,
      NIGHT: baseCoverage.shifts.NIGHT,
    },
  }

  // Filter swaps for this date
  const relevantSwaps = swaps.filter(s => s.date === baseCoverage.date)

  // Apply swaps
  for (const swap of relevantSwaps) {
    if (swap.type === 'DOUBLE' && swap.shift) {
      // DOUBLE: Person works an additional shift beyond their base
      result.shifts[swap.shift]++
    }
    // COVER and SWAP are 1:1 exchanges, they don't change totals
  }

  return result
}
