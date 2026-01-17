import { getEffectiveDailyLogData } from '../getEffectiveDailyLogData'
import { WeeklyPlan, SwapEvent, Incident, DayInfo, Representative } from '@/domain/types'

const mockPlan: WeeklyPlan = {
    id: 'w1', weekStart: '2026-01-05',
    agents: [
        {
            representativeId: 'A',
            days: { '2026-01-08': { assignment: { type: 'SINGLE', shift: 'DAY' } } }
        },
        {
            representativeId: 'B',
            days: { '2026-01-08': { assignment: { type: 'NONE' } } }
        }
    ]
}

const mockCalendarDays: DayInfo[] = [
    { date: '2026-01-08', isWorkingDay: true, isWeekend: false, label: 'Thu 8', kind: 'WORKING' }
]

const mockRepresentatives: Representative[] = [
    { id: 'A', name: 'Agent A', baseShift: 'DAY', baseSchedule: ['DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'OFF', 'OFF'] },
    { id: 'B', name: 'Agent B', baseShift: 'NIGHT', baseSchedule: ['NIGHT', 'NIGHT', 'NIGHT', 'NIGHT', 'NIGHT', 'OFF', 'OFF'] }
]

describe('getEffectiveDailyLogData', () => {
    const date = '2026-01-08'  // Thursday

    it('identifies WORKING status', () => {
        const res = getEffectiveDailyLogData(mockPlan, [], [], date, mockCalendarDays, mockRepresentatives)
        const agentA_Day = res.find(e => e.representativeId === 'A' && e.shift === 'DAY')
        expect(agentA_Day?.logStatus).toBe('WORKING')
        expect(agentA_Day?.isResponsible).toBe(true)
    })

    it('identifies COVERING and COVERED status', () => {
        const swap: SwapEvent = {
            id: 's1', type: 'COVER', date, shift: 'DAY',
            fromRepresentativeId: 'A', toRepresentativeId: 'B', createdAt: ''
        }
        const res = getEffectiveDailyLogData(mockPlan, [swap], [], date, mockCalendarDays, mockRepresentatives)

        const agentA = res.find(e => e.representativeId === 'A' && e.shift === 'DAY')
        const agentB = res.find(e => e.representativeId === 'B' && e.shift === 'DAY')

        expect(agentA?.logStatus).toBe('COVERED')
        expect(agentA?.isResponsible).toBe(false)

        expect(agentB?.logStatus).toBe('COVERING')
        expect(agentB?.isResponsible).toBe(true)
    })

    it('identifies ABSENT status via Incident', () => {
        const incident: Incident = {
            id: 'i1', type: 'VACACIONES', startDate: date, representativeId: 'A',
            createdAt: '', duration: 1
        }
        const res = getEffectiveDailyLogData(mockPlan, [], [incident], date, mockCalendarDays, mockRepresentatives)

        const agentA = res.find(e => e.representativeId === 'A' && e.shift === 'DAY')

        // resolveEffectiveDuty returns NONE with reason VACACIONES
        // Adapter logic should map this to ABSENT
        expect(agentA?.logStatus).toBe('ABSENT')
        expect(agentA?.isResponsible).toBe(false) // Not responsible if excused
    })
})
