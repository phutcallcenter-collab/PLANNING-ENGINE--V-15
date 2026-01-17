import { applySwapsToCoverage } from '../../../src/domain/planning/applySwapsToCoverage'
import { DailyShiftCoverage } from '../../../src/domain/planning/dailyCoverage'
import { SwapEvent } from '../../../src/domain/planning/swap'

describe('Domain Logic: applySwapsToCoverage', () => {
  const date = '2024-04-03'

  it('un swap simple NO debe cambiar el total de cobertura del turno', () => {
    const baseCoverage: DailyShiftCoverage = {
      date: date,
      shifts: { DAY: 5, NIGHT: 2 },
    }
    const swaps: SwapEvent[] = [
      {
        id: 'swap1',
        date: date,
        shift: 'DAY',
        fromRepresentativeId: 'rep-A',
        toRepresentativeId: 'rep-B',
        createdAt: '2024-04-01T00:00:00Z',
      },
    ]

    const finalCoverage = applySwapsToCoverage(baseCoverage, swaps)
    // El total NO cambia porque es un intercambio 1 a 1.
    expect(finalCoverage.shifts.DAY).toBe(5)
    // La función no debería tocar el turno de noche.
    expect(finalCoverage.shifts.NIGHT).toBe(2)
  })

  it('múltiples swaps en el mismo turno se aplican correctamente y no cambian el total', () => {
    const baseCoverage: DailyShiftCoverage = {
      date: date,
      shifts: { DAY: 5, NIGHT: 2 },
    }
    const swaps: SwapEvent[] = [
      {
        id: 'swap1',
        date: date,
        shift: 'DAY',
        fromRepresentativeId: 'rep-A',
        toRepresentativeId: 'rep-B',
        createdAt: '2024-04-01T00:00:00Z',
      },
      {
        id: 'swap2',
        date: date,
        shift: 'DAY',
        fromRepresentativeId: 'rep-C',
        toRepresentativeId: 'rep-D',
        createdAt: '2024-04-01T00:00:00Z',
      },
    ]

    const finalCoverage = applySwapsToCoverage(baseCoverage, swaps)
    expect(finalCoverage.shifts.DAY).toBe(5)
    expect(finalCoverage.shifts.NIGHT).toBe(2)
  })

  it('swaps en diferentes turnos funcionan independientemente y no cambian totales', () => {
    const baseCoverage: DailyShiftCoverage = {
      date: date,
      shifts: { DAY: 5, NIGHT: 2 },
    }
    const swaps: SwapEvent[] = [
      {
        id: 'swap-day',
        date: date,
        shift: 'DAY',
        fromRepresentativeId: 'rep-A',
        toRepresentativeId: 'rep-B',
        createdAt: '2024-04-01T00:00:00Z',
      },
      {
        id: 'swap-night',
        date: date,
        shift: 'NIGHT',
        fromRepresentativeId: 'rep-X',
        toRepresentativeId: 'rep-Y',
        createdAt: '2024-04-01T00:00:00Z',
      },
    ]

    const finalCoverage = applySwapsToCoverage(baseCoverage, swaps)
    expect(finalCoverage.shifts.DAY).toBe(5)
    expect(finalCoverage.shifts.NIGHT).toBe(2)
  })

  it('no muta el objeto de cobertura base original', () => {
    const baseCoverage: DailyShiftCoverage = {
      date: date,
      shifts: { DAY: 5, NIGHT: 2 },
    }
    const originalCoverage = structuredClone(baseCoverage)
    const swaps: SwapEvent[] = [
      {
        id: 'swap1',
        date: date,
        shift: 'DAY',
        fromRepresentativeId: 'rep-A',
        toRepresentativeId: 'rep-B',
        createdAt: '2024-04-01T00:00:00Z',
      },
    ]

    applySwapsToCoverage(baseCoverage, swaps)

    expect(baseCoverage).toEqual(originalCoverage)
  })

  it('si no hay swaps, devuelve una copia idéntica de la cobertura base', () => {
    const baseCoverage: DailyShiftCoverage = {
      date: date,
      shifts: { DAY: 5, NIGHT: 2 },
    }
    const finalCoverage = applySwapsToCoverage(baseCoverage, [])
    expect(finalCoverage).toEqual(baseCoverage)
    expect(finalCoverage).not.toBe(baseCoverage) // Must be a clone
  })
})
