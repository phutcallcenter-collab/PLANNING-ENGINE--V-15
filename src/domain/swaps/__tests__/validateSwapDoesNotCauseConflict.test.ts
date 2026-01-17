import { validateSwapDoesNotCauseConflict } from '../validateSwapDoesNotCauseConflict'
import { SwapEvent, Representative } from '../../types'

describe('validateSwapDoesNotCauseConflict', () => {
  const mockReps: Representative[] = [
    {
      id: 'rep-a',
      name: 'Ana García',
      isActive: true,
      baseShift: 'DAY',
      baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'OFF', 6: 'OFF' },
      role: 'SALES',
      orderIndex: 0,
    },
    {
      id: 'rep-b',
      name: 'Bruno López',
      isActive: true,
      baseShift: 'NIGHT',
      baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'OFF', 6: 'OFF' },
      role: 'SALES',
      orderIndex: 0,
    },
    {
      id: 'rep-c',
      name: 'Carlos Ruiz',
      isActive: true,
      baseShift: 'DAY',
      baseSchedule: { 0: 'OFF', 1: 'OFF', 2: 'OFF', 3: 'OFF', 4: 'OFF', 5: 'OFF', 6: 'OFF' },
      role: 'SALES',
      orderIndex: 0,
    },
  ]

  const mockGetBaseAssignment = (repId: string) => {
    if (repId === 'rep-a') return 'DAY'
    if (repId === 'rep-b') return 'NIGHT'
    if (repId === 'rep-c') return 'OFF'
    return null
  }

  describe('COVER - Escenarios hostiles', () => {
    it('RECHAZA: intentar que alguien cubra cuando ya está trabajando', () => {
      const proposedSwap: SwapEvent = {
        id: 'swap-1',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'DAY',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-b', // Bruno ya trabaja NIGHT
        createdAt: '2026-01-01T00:00:00Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).toThrow(/Bruno López ya tiene asignado el turno de Noche/)
    })

    it('ACEPTA: que alguien libre cubra', () => {
      const proposedSwap: SwapEvent = {
        id: 'swap-1',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'DAY',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-c', // Carlos está OFF
        createdAt: '2026-01-01T00:00:00Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).not.toThrow()
    })

    it('RECHAZA: doble cobertura sobre la misma persona', () => {
      const existingSwap: SwapEvent = {
        id: 'swap-existing',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'NIGHT',
        fromRepresentativeId: 'rep-b',
        toRepresentativeId: 'rep-c', // Carlos ya cubre NIGHT
        createdAt: '2026-01-01T00:00:00Z',
      }

      const proposedSwap: SwapEvent = {
        id: 'swap-new',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'DAY',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-c', // Carlos intenta cubrir DAY también
        createdAt: '2026-01-01T00:00:01Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [existingSwap],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).toThrow(/Carlos Ruiz ya tiene asignado el turno de Noche/)
    })
  })

  describe('DOUBLE - Escenarios hostiles', () => {
    it('RECHAZA: doblar turno cuando ya está trabajando', () => {
      const proposedSwap: SwapEvent = {
        id: 'swap-1',
        type: 'DOUBLE',
        date: '2026-01-15',
        shift: 'NIGHT',
        representativeId: 'rep-a', // Ana ya trabaja DAY
        createdAt: '2026-01-01T00:00:00Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).toThrow(/Ana García ya tiene asignado el turno de Día/)
    })

    it('ACEPTA: doblar turno cuando está libre', () => {
      const proposedSwap: SwapEvent = {
        id: 'swap-1',
        type: 'DOUBLE',
        date: '2026-01-15',
        shift: 'DAY',
        representativeId: 'rep-c', // Carlos está OFF
        createdAt: '2026-01-01T00:00:00Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).not.toThrow()
    })

    it('RECHAZA: doblar turno después de cubrir', () => {
      const existingSwap: SwapEvent = {
        id: 'swap-existing',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'DAY',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-c', // Carlos cubre DAY
        createdAt: '2026-01-01T00:00:00Z',
      }

      const proposedSwap: SwapEvent = {
        id: 'swap-new',
        type: 'DOUBLE',
        date: '2026-01-15',
        shift: 'NIGHT',
        representativeId: 'rep-c', // Carlos intenta doblar NIGHT
        createdAt: '2026-01-01T00:00:01Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [existingSwap],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).toThrow(/Carlos Ruiz ya tiene asignado el turno de Día/)
    })
  })

  describe('SWAP - Escenarios hostiles', () => {
    it('RECHAZA: intercambiar con turno incorrecto', () => {
      const proposedSwap: SwapEvent = {
        id: 'swap-1',
        type: 'SWAP',
        date: '2026-01-15',
        fromRepresentativeId: 'rep-a',
        fromShift: 'NIGHT', // Ana trabaja DAY, no NIGHT
        toRepresentativeId: 'rep-b',
        toShift: 'DAY', // Bruno trabaja NIGHT, no DAY
        createdAt: '2026-01-01T00:00:00Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).toThrow(/tiene asignado/)
    })

    it('ACEPTA: intercambiar turnos correctamente', () => {
      const proposedSwap: SwapEvent = {
        id: 'swap-1',
        type: 'SWAP',
        date: '2026-01-15',
        fromRepresentativeId: 'rep-a',
        fromShift: 'DAY', // Ana trabaja DAY ✓
        toRepresentativeId: 'rep-b',
        toShift: 'NIGHT', // Bruno trabaja NIGHT ✓
        createdAt: '2026-01-01T00:00:00Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).not.toThrow()
    })
  })

  describe('Múltiples swaps en cascada', () => {
    it('RECHAZA: cadena de coberturas que genera conflicto', () => {
      // Escenario:
      // 1. Ana (DAY) cubre a Carlos (OFF) → Carlos ahora trabaja DAY
      // 2. Intentar que Carlos cubra a Bruno (NIGHT) → RECHAZA (Carlos ya trabaja DAY)

      const existingSwap: SwapEvent = {
        id: 'swap-1',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'DAY',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-c',
        createdAt: '2026-01-01T00:00:00Z',
      }

      const proposedSwap: SwapEvent = {
        id: 'swap-2',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'NIGHT',
        fromRepresentativeId: 'rep-b',
        toRepresentativeId: 'rep-c', // Carlos ya cubre DAY
        createdAt: '2026-01-01T00:00:01Z',
      }

      expect(() => {
        validateSwapDoesNotCauseConflict({
          proposedSwap,
          allSwaps: [existingSwap],
          getBaseAssignment: mockGetBaseAssignment,
          representatives: mockReps,
        })
      }).toThrow(/Carlos Ruiz ya tiene asignado/)
    })
  })
})
