import { resolveEffectiveDuty } from '../resolveEffectiveDuty'
import { WeeklyPlan, SwapEvent, Incident, DayInfo, Representative } from '@/domain/types'

const mockPlan: WeeklyPlan = {
    weekStart: '2026-01-05',
    agents: [
        {
            representativeId: 'A',
            days: {
                '2026-01-08': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } }, // A works DAY
            },
        },
        {
            representativeId: 'B',
            days: {
                '2026-01-08': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'NIGHT' } }, // B works NIGHT
            },
        },
        {
            representativeId: 'C',
            days: {
                '2026-01-08': { status: 'OFF', source: 'BASE', assignment: { type: 'NONE' } }, // C is OFF
            }
        }
    ],
}

const mockCalendarDays: DayInfo[] = [
    { date: '2026-01-08', dayOfWeek: 4, kind: 'WORKING', isSpecial: false }
]

const mockRepresentatives: Representative[] = [
    {
        id: 'A', name: 'Agent A', baseShift: 'DAY', role: 'SALES', isActive: true, orderIndex: 0,
        baseSchedule: { 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF', 0: 'OFF' }
    },
    {
        id: 'B', name: 'Agent B', baseShift: 'NIGHT', role: 'SALES', isActive: true, orderIndex: 1,
        baseSchedule: { 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF', 0: 'OFF' }
    },
    {
        id: 'C', name: 'Agent C', baseShift: 'DAY', role: 'SALES', isActive: true, orderIndex: 2,
        baseSchedule: { 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF', 0: 'OFF' }
    }
]

describe('resolveEffectiveDuty', () => {
    const date = '2026-01-08'  // Thursday

    it('BASE: returns true if base assignment exists and no changes', () => {
        const res = resolveEffectiveDuty(mockPlan, [], [], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
        expect(res).toEqual({ shouldWork: true, role: 'BASE', source: 'BASE' })
    })

    it('BASE: returns false if no assignment', () => {
        const res = resolveEffectiveDuty(mockPlan, [], [], date, 'NIGHT', 'A', mockCalendarDays, mockRepresentatives)
        expect(res.shouldWork).toBe(false)
    })

    it('INCIDENT: blocking incident prevents work', () => {
        const incident: Incident = {
            id: 'i1', type: 'VACACIONES', startDate: date, representativeId: 'A',
            createdAt: '',
            duration: 1
        }
        const res = resolveEffectiveDuty(mockPlan, [], [incident], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
        expect(res).toEqual({ shouldWork: false, role: 'NONE', reason: 'VACACIONES', source: 'INCIDENT' })
    })

    describe('COVER', () => {
        it('COVERED: person being covered should NOT work', () => {
            const swap: SwapEvent = {
                id: 's1', type: 'COVER', date, shift: 'DAY',
                fromRepresentativeId: 'A', toRepresentativeId: 'C',
                createdAt: ''
            }
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: false, role: 'COVERED', reason: 'Cubierto por C', source: 'SWAP' })
        })

        it('COVERING: person covering should WORK', () => {
            const swap: SwapEvent = {
                id: 's1', type: 'COVER', date, shift: 'DAY',
                fromRepresentativeId: 'A', toRepresentativeId: 'C',
                createdAt: ''
            }
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'C', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: true, role: 'COVERING', reason: 'Cubriendo a A', source: 'SWAP' })
        })
    })

    describe('DOUBLE', () => {
        it('DOUBLE: person doing double shift works', () => {
            const swap: SwapEvent = {
                id: 'd1', type: 'DOUBLE', date, shift: 'NIGHT',
                representativeId: 'A',
                createdAt: ''
            }
            // A normally works DAY. Checks NIGHT.
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'NIGHT', 'A', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: true, role: 'DOUBLE', reason: 'Turno adicional', source: 'SWAP' })
        })
    })

    describe('SWAP (Exchange)', () => {
        const swap: SwapEvent = {
            id: 'x1', type: 'SWAP', date,
            fromRepresentativeId: 'A', fromShift: 'DAY',
            toRepresentativeId: 'B', toShift: 'NIGHT',
            createdAt: ''
        }

        it('A (from) works NIGHT (toShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'NIGHT', 'A', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: true, role: 'SWAPPED_IN', reason: 'Intercambio con B', source: 'SWAP' })
        })

        it('A (from) does NOT work DAY (fromShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: false, role: 'SWAPPED_OUT', reason: 'Intercambio con B', source: 'SWAP' })
        })

        it('B (to) works DAY (fromShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'B', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: true, role: 'SWAPPED_IN', reason: 'Intercambio con A', source: 'SWAP' })
        })

        it('B (to) does NOT work NIGHT (toShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'NIGHT', 'B', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: false, role: 'SWAPPED_OUT', reason: 'Intercambio con A', source: 'SWAP' })
        })
    })
})
