import { resolveEffectiveDuty } from '../resolveEffectiveDuty'
import { WeeklyPlan, SwapEvent, Incident, DayInfo, Representative } from '@/domain/types'

const mockPlan: WeeklyPlan = {
    id: 'w1',
    weekStart: '2026-01-05',
    agents: [
        {
            representativeId: 'A',
            days: {
                '2026-01-08': { assignment: { type: 'SINGLE', shift: 'DAY' } }, // A works DAY
            },
        },
        {
            representativeId: 'B',
            days: {
                '2026-01-08': { assignment: { type: 'SINGLE', shift: 'NIGHT' } }, // B works NIGHT
            },
        },
        {
            representativeId: 'C',
            days: {
                '2026-01-08': { assignment: { type: 'NONE' } }, // C is OFF
            }
        }
    ],
}

const mockCalendarDays: DayInfo[] = [
    { date: '2026-01-08', isWorkingDay: true, isWeekend: false, label: 'Thu 8', kind: 'WORKING' }
]

const mockRepresentatives: Representative[] = [
    { id: 'A', name: 'Agent A', baseShift: 'DAY', baseSchedule: ['DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'OFF', 'OFF'] },
    { id: 'B', name: 'Agent B', baseShift: 'NIGHT', baseSchedule: ['NIGHT', 'NIGHT', 'NIGHT', 'NIGHT', 'NIGHT', 'OFF', 'OFF'] },
    { id: 'C', name: 'Agent C', baseShift: 'DAY', baseSchedule: ['DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'OFF', 'OFF'] }
]

describe('resolveEffectiveDuty', () => {
    const date = '2026-01-08'  // Thursday

    it('BASE: returns true if base assignment exists and no changes', () => {
        const res = resolveEffectiveDuty(mockPlan, [], [], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
        expect(res).toEqual({ shouldWork: true, role: 'BASE' })
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
        expect(res).toEqual({ shouldWork: false, role: 'NONE', reason: 'VACACIONES' })
    })

    describe('COVER', () => {
        it('COVERED: person being covered should NOT work', () => {
            const swap: SwapEvent = {
                id: 's1', type: 'COVER', date, shift: 'DAY',
                fromRepresentativeId: 'A', toRepresentativeId: 'C',
                createdAt: ''
            }
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: false, role: 'COVERED', reason: 'Cubierto por C' })
        })

        it('COVERING: person covering should WORK', () => {
            const swap: SwapEvent = {
                id: 's1', type: 'COVER', date, shift: 'DAY',
                fromRepresentativeId: 'A', toRepresentativeId: 'C',
                createdAt: ''
            }
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'C', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: true, role: 'COVERING', reason: 'Cubriendo a A' })
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
            expect(res).toEqual({ shouldWork: true, role: 'DOUBLE', reason: 'Turno adicional' })
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
            expect(res).toEqual({ shouldWork: true, role: 'SWAPPED_IN', reason: 'Intercambio con B' })
        })

        it('A (from) does NOT work DAY (fromShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'A', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: false, role: 'SWAPPED_OUT', reason: 'Intercambio con B' })
        })

        it('B (to) works DAY (fromShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'DAY', 'B', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: true, role: 'SWAPPED_IN', reason: 'Intercambio con A' })
        })

        it('B (to) does NOT work NIGHT (toShift)', () => {
            const res = resolveEffectiveDuty(mockPlan, [swap], [], date, 'NIGHT', 'B', mockCalendarDays, mockRepresentatives)
            expect(res).toEqual({ shouldWork: false, role: 'SWAPPED_OUT', reason: 'Intercambio con A' })
        })
    })
})
