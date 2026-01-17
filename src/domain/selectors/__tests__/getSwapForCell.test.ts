/**
 * 🧪 TESTS DEL SELECTOR getSwapForCell
 * 
 * Estos tests garantizan que la lógica de detección sea correcta y estable.
 */

import { getSwapForCell } from '../getSwapForCell'
import { SwapEvent } from '../../types'

describe('getSwapForCell', () => {
  const mockSwaps: SwapEvent[] = [
    {
      id: 'swap-1',
      type: 'COVER',
      date: '2026-01-15',
      shift: 'DAY',
      fromRepresentativeId: 'rep-a',
      toRepresentativeId: 'rep-b',
      createdAt: Date.now(),
    },
    {
      id: 'swap-2',
      type: 'DOUBLE',
      date: '2026-01-15',
      shift: 'NIGHT',
      representativeId: 'rep-c',
      createdAt: Date.now(),
    },
    {
      id: 'swap-3',
      type: 'SWAP',
      date: '2026-01-16',
      fromRepresentativeId: 'rep-a',
      toRepresentativeId: 'rep-d',
      fromShift: 'DAY',
      toShift: 'NIGHT',
      createdAt: Date.now(),
    },
  ]

  describe('COVER type', () => {
    it('detecta swap para fromRep en el shift correcto', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-15',
        repId: 'rep-a',
        shift: 'DAY',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('swap-1')
    })

    it('detecta swap para toRep en el shift correcto', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-15',
        repId: 'rep-b',
        shift: 'DAY',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('swap-1')
    })

    it('NO detecta swap si el shift no coincide', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-15',
        repId: 'rep-a',
        shift: 'NIGHT',
      })

      expect(result).toBeNull()
    })

    it('NO detecta swap si la fecha no coincide', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-16',
        repId: 'rep-a',
        shift: 'DAY',
      })

      // Debe encontrar el SWAP, no el COVER
      expect(result?.type).toBe('SWAP')
    })
  })

  describe('DOUBLE type', () => {
    it('detecta swap para el rep en el shift correcto', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-15',
        repId: 'rep-c',
        shift: 'NIGHT',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('swap-2')
    })

    it('NO detecta swap si el shift no coincide', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-15',
        repId: 'rep-c',
        shift: 'DAY',
      })

      expect(result).toBeNull()
    })

    it('NO detecta swap para otro rep', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-15',
        repId: 'rep-a',
        shift: 'NIGHT',
      })

      expect(result).toBeNull()
    })
  })

  describe('SWAP type', () => {
    it('detecta swap para fromRep independientemente del shift', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-16',
        repId: 'rep-a',
        shift: 'DAY',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('swap-3')
    })

    it('detecta swap para toRep independientemente del shift', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-16',
        repId: 'rep-d',
        shift: 'NIGHT',
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('swap-3')
    })

    it('detecta swap incluso con shift diferente al asignado', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-16',
        repId: 'rep-a',
        shift: 'NIGHT', // rep-a tiene DAY en el swap
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe('swap-3')
    })
  })

  describe('Edge cases', () => {
    it('retorna null si no hay swaps', () => {
      const result = getSwapForCell([], {
        date: '2026-01-15',
        repId: 'rep-a',
        shift: 'DAY',
      })

      expect(result).toBeNull()
    })

    it('retorna null si ningún swap coincide', () => {
      const result = getSwapForCell(mockSwaps, {
        date: '2026-01-20',
        repId: 'rep-z',
        shift: 'DAY',
      })

      expect(result).toBeNull()
    })

    it('lanza error si múltiples swaps afectan la misma celda (invariante)', () => {
      const duplicates: SwapEvent[] = [
        {
          id: 'first',
          type: 'COVER',
          date: '2026-01-15',
          shift: 'DAY',
          fromRepresentativeId: 'rep-a',
          toRepresentativeId: 'rep-b',
          createdAt: Date.now(),
        },
        {
          id: 'second',
          type: 'DOUBLE',
          date: '2026-01-15',
          shift: 'DAY',
          representativeId: 'rep-a',
          createdAt: Date.now(),
        },
      ]

      expect(() => {
        getSwapForCell(duplicates, {
          date: '2026-01-15',
          repId: 'rep-a',
          shift: 'DAY',
        })
      }).toThrow(/INVARIANT VIOLATION.*Multiple swaps/)
    })
  })
})
