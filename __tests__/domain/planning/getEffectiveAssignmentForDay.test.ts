import { getEffectiveAssignmentForDay } from '@/domain/planning/getEffectiveAssignmentForDay'
import { SwapEvent } from '@/domain/types'

describe('getEffectiveAssignmentForDay', () => {
  describe('Base assignment without swaps', () => {
    it('retorna el base assignment cuando no hay swaps', () => {
      const result = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: 'DAY',
        swaps: [],
      })

      expect(result).toBe('DAY')
    })

    it('retorna OFF si el base es OFF', () => {
      const result = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: 'OFF',
        swaps: [],
      })

      expect(result).toBe('OFF')
    })

    it('retorna null si no hay base assignment', () => {
      const result = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: null,
        swaps: [],
      })

      expect(result).toBeNull()
    })
  })

  describe('COVER swaps', () => {
    it('fromRep deja de trabajar y toRep empieza a trabajar', () => {
      const swap: SwapEvent = {
        id: 'swap-1',
        type: 'COVER',
        date: '2026-01-15',
        shift: 'DAY',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-b',
        createdAt: '2026-01-01T00:00:00Z',
      }

      // fromRep: trabajaba DAY, ahora OFF
      const fromResult = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: 'DAY',
        swaps: [swap],
      })
      expect(fromResult).toBe('OFF')

      // toRep: estaba OFF, ahora trabaja DAY
      const toResult = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-b',
        baseAssignment: 'OFF',
        swaps: [swap],
      })
      expect(toResult).toBe('DAY')
    })
  })

  describe('DOUBLE swaps', () => {
    it('rep agrega turno adicional', () => {
      const swap: SwapEvent = {
        id: 'swap-1',
        type: 'DOUBLE',
        date: '2026-01-15',
        shift: 'NIGHT',
        representativeId: 'rep-a',
        createdAt: '2026-01-01T00:00:00Z',
      }

      // Rep estaba OFF, ahora trabaja NIGHT
      const result = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: 'OFF',
        swaps: [swap],
      })
      expect(result).toBe('NIGHT')
    })
  })

  describe('SWAP swaps', () => {
    it('intercambia turnos entre dos reps', () => {
      const swap: SwapEvent = {
        id: 'swap-1',
        type: 'SWAP',
        date: '2026-01-15',
        fromRepresentativeId: 'rep-a',
        toRepresentativeId: 'rep-b',
        fromShift: 'DAY',
        toShift: 'NIGHT',
        createdAt: '2026-01-01T00:00:00Z',
      }

      // rep-a: trabajaba DAY, ahora NIGHT
      const fromResult = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: 'DAY',
        swaps: [swap],
      })
      expect(fromResult).toBe('NIGHT')

      // rep-b: trabajaba NIGHT, ahora DAY
      const toResult = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-b',
        baseAssignment: 'NIGHT',
        swaps: [swap],
      })
      expect(toResult).toBe('DAY')
    })
  })

  describe('Multiple swaps on same day', () => {
    it('aplica swaps en orden', () => {
      const swaps: SwapEvent[] = [
        {
          id: 'swap-1',
          type: 'COVER',
          date: '2026-01-15',
          shift: 'DAY',
          fromRepresentativeId: 'rep-a',
          toRepresentativeId: 'rep-b',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'swap-2',
          type: 'DOUBLE',
          date: '2026-01-15',
          shift: 'NIGHT',
          representativeId: 'rep-b',
          createdAt: '2026-01-01T00:00:01Z',
        },
      ]

      // rep-a: trabajaba DAY, cubierto → OFF
      const repAResult = getEffectiveAssignmentForDay({
        date: '2026-01-15',
        repId: 'rep-a',
        baseAssignment: 'DAY',
        swaps,
      })
      expect(repAResult).toBe('OFF')

      // rep-b: OFF → cubre DAY → agrega NIGHT
      // PROBLEMA: esto generaría doble asignación
      // (Este caso debería ser bloqueado por validación)
    })
  })
})
