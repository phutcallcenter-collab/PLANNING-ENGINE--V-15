import { applySwapsToCoverage } from '../applySwapsToCoverage'
import { SwapEvent, DailyShiftCoverage } from '@/domain/types'

describe('applySwapsToCoverage', () => {
    const date = '2026-01-10'
    const base: DailyShiftCoverage = {
        date,
        shifts: {
            DAY: 3,
            NIGHT: 2
        }
    }

    it('COVER: net change is 0 (1 leaves, 1 enters)', () => {
        const swap: SwapEvent = {
            id: 's1', type: 'COVER', date, shift: 'DAY',
            fromRepresentativeId: 'A', toRepresentativeId: 'B',
            createdAt: ''
        }
        const res = applySwapsToCoverage(base, [swap])
        expect(res.shifts.DAY).toBe(3)
        // Ensure Night is untouched
        expect(res.shifts.NIGHT).toBe(2)
    })

    it('DOUBLE: increases coverage by 1', () => {
        const swap: SwapEvent = {
            id: 'd1', type: 'DOUBLE', date, shift: 'NIGHT',
            representativeId: 'A',
            createdAt: ''
        }
        const res = applySwapsToCoverage(base, [swap])
        expect(res.shifts.NIGHT).toBe(3) // 2 + 1
        expect(res.shifts.DAY).toBe(3)
    })

    it('SWAP: net change is 0 for both shifts', () => {
        const swap: SwapEvent = {
            id: 'x1', type: 'SWAP', date,
            fromRepresentativeId: 'A', fromShift: 'DAY',
            toRepresentativeId: 'B', toShift: 'NIGHT',
            createdAt: ''
        }
        const res = applySwapsToCoverage(base, [swap])
        expect(res.shifts.DAY).toBe(3) // (3 - 1 + 1)
        expect(res.shifts.NIGHT).toBe(2) // (2 - 1 + 1)
    })

    it('ignores swaps on other dates', () => {
        const swap: SwapEvent = {
            id: 'd1', type: 'DOUBLE', date: '2026-01-11', shift: 'DAY',
            representativeId: 'A',
            createdAt: ''
        }
        const res = applySwapsToCoverage(base, [swap])
        expect(res.shifts.DAY).toBe(3)
    })
})
