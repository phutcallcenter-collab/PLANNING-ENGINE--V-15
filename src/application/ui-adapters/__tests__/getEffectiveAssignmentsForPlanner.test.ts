import { getEffectiveAssignmentsForPlanner } from '../getEffectiveAssignmentsForPlanner'
import { WeeklyPlan, SwapEvent, Incident, Representative } from '@/domain/types'
import { DayInfo } from '@/domain/calendar/types'

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

const mockCalendarDays: DayInfo[] = [
    { date: '2026-01-10', dayOfWeek: 5, isSpecial: false, specialKind: null, label: null }
]

const mockRepresentatives: Representative[] = [
    { id: 'A', name: 'Agent A', baseSchedule: {}, baseShift: 'DAY' },
    { id: 'B', name: 'Agent B', baseSchedule: {}, baseShift: 'NIGHT' }
]

describe('getEffectiveAssignmentsForPlanner', () => {
    const date = '2026-01-10'

    it('maps BASE role correctly', () => {
        const res = getEffectiveAssignmentsForPlanner(mockPlan, [], [], mockCalendarDays, mockRepresentatives)
        expect(res['A'][date].DAY.role).toBe('BASE')
        expect(res['A'][date].DAY.shouldWork).toBe(true)
        expect(res['B'][date].DAY.role).toBe('NONE')
    })

    it('maps COVER role correctly', () => {
        // B covers A
        const swap: SwapEvent = {
            id: 's1', type: 'COVER', date, shift: 'DAY',
            fromRepresentativeId: 'A', toRepresentativeId: 'B',
            createdAt: ''
        }
        const res = getEffectiveAssignmentsForPlanner(mockPlan, [swap], [], mockCalendarDays, mockRepresentatives)

        expect(res['A'][date].DAY.role).toBe('COVERED')
        expect(res['A'][date].DAY.shouldWork).toBe(false)

        expect(res['B'][date].DAY.role).toBe('COVERING')
        expect(res['B'][date].DAY.shouldWork).toBe(true)
    })

    it('maps Incident blocking correctly', () => {
        const incident: Incident = {
            id: 'i1', type: 'VACACIONES', startDate: date, representativeId: 'A',
            createdAt: '', duration: 1
        }
        const res = getEffectiveAssignmentsForPlanner(mockPlan, [], [incident], mockCalendarDays, mockRepresentatives)
        expect(res['A'][date].DAY.role).toBe('NONE') // Blocked
        expect(res['A'][date].DAY.shouldWork).toBe(false)
    })
})
