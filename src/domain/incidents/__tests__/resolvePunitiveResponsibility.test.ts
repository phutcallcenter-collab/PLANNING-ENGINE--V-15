import { resolvePunitiveResponsibility } from '../resolvePunitiveResponsibility'
import { WeeklyPlan, SwapEvent } from '@/domain/types'

const mockPlan: WeeklyPlan = {
    id: 'w1', weekStart: '2026-01-05',
    agents: [
        {
            representativeId: 'A',
            days: { '2026-01-10': { assignment: { type: 'SINGLE', shift: 'DAY' } } }
        },
        {
            representativeId: 'B',
            days: { '2026-01-10': { assignment: { type: 'NONE' } } }
        }
    ]
}

describe('resolvePunitiveResponsibility', () => {
    const date = '2026-01-10'

    it('punishes BASE worker normally', () => {
        // A works DAY. Not swapped. Should be punished if incident occurs (i.e. is responsible).
        const result = resolvePunitiveResponsibility(mockPlan, [], [], date, 'DAY', 'A', [], [])
        expect(result).toBe(true)
    })

    it('does NOT punish COVERED worker', () => {
        // A covered by B
        const swap: SwapEvent = {
            id: 's1', type: 'COVER', date, shift: 'DAY',
            fromRepresentativeId: 'A', toRepresentativeId: 'B',
            createdAt: ''
        }
        const result = resolvePunitiveResponsibility(mockPlan, [swap], [], date, 'DAY', 'A', [], [])
        expect(result).toBe(false)
    })

    it('punishes COVERING worker', () => {
        // B covers A
        const swap: SwapEvent = {
            id: 's1', type: 'COVER', date, shift: 'DAY',
            fromRepresentativeId: 'A', toRepresentativeId: 'B',
            createdAt: ''
        }
        const result = resolvePunitiveResponsibility(mockPlan, [swap], [], date, 'DAY', 'B', [], [])
        expect(result).toBe(true)
    })

    it('punishes SWAPPED_IN worker', () => {
        // A <-> B. A (Day) swaps with B (Night).
        // B should work DAY.
        const swap: SwapEvent = {
            id: 'x1', type: 'SWAP', date,
            fromRepresentativeId: 'A', fromShift: 'DAY',
            toRepresentativeId: 'B', toShift: 'NIGHT',
            createdAt: ''
        }
        const result = resolvePunitiveResponsibility(mockPlan, [swap], [], date, 'DAY', 'B', [], [])
        expect(result).toBe(true)
    })
})
