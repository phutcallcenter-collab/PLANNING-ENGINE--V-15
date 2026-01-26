import { getEffectiveDailyCoverage } from '../getEffectiveDailyCoverage'
import { WeeklyPlan, CoverageRule, SwapEvent } from '@/domain/types'

const mockPlan: WeeklyPlan = {
    weekStart: '2026-01-05',
    agents: [
        {
            representativeId: 'A',
            days: { '2026-01-10': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } } }
        },
        {
            representativeId: 'B',
            days: { '2026-01-10': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } } }
        },
        {
            representativeId: 'C',
            days: { '2026-01-10': { status: 'OFF', source: 'BASE', assignment: { type: 'NONE' } } }
        }
    ]
}

const mockRules: CoverageRule[] = [
    { id: 'r1', scope: { type: 'GLOBAL' }, required: 2 }
]

const mockReps: any[] = [
    { id: 'A', isActive: true, baseSchedule: { 1: 'WORKING' } },
    { id: 'B', isActive: true, baseSchedule: { 1: 'WORKING' } },
    { id: 'C', isActive: true, baseSchedule: { 1: 'OFF' } }
]


describe('getEffectiveDailyCoverage', () => {
    const date = '2026-01-10'

    it('calculates base coverage correctly (OK status)', () => {
        // 2 agents working DAY. Rule requires 2.
        const res = getEffectiveDailyCoverage(mockPlan, [], mockRules, date, [], [], mockReps)
        expect(res.DAY).toEqual({ actual: 2, required: 2, status: 'OK', reason: 'Global (Estándar)' })
        expect(res.NIGHT).toEqual({ actual: 0, required: 2, status: 'DEFICIT', reason: 'Global (Estándar)' })
    })

    it('reflects DOUBLE swap increment (SURPLUS)', () => {
        // C does double on DAY (3 total)
        const swap: SwapEvent = {
            id: 'd1', type: 'DOUBLE', date, shift: 'DAY', representativeId: 'C',
            createdAt: ''
        }
        const res = getEffectiveDailyCoverage(mockPlan, [swap], mockRules, date, [], [], mockReps)
        expect(res.DAY).toEqual({ actual: 3, required: 2, status: 'SURPLUS', reason: 'Global (Estándar)' })
    })

    it('reflects COVER as net zero', () => {
        // A (working) covered by C (not working). 2 total.
        const swap: SwapEvent = {
            id: 'c1', type: 'COVER', date, shift: 'DAY',
            fromRepresentativeId: 'A', toRepresentativeId: 'C', createdAt: ''
        }
        const res = getEffectiveDailyCoverage(mockPlan, [swap], mockRules, date, [], [], mockReps)
        expect(res.DAY.actual).toBe(2)
        expect(res.DAY.status).toBe('OK')
    })
})
