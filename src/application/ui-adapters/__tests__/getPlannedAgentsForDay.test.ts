
import { getPlannedAgentsForDay } from '../getPlannedAgentsForDay'
import { Representative, SpecialSchedule, DailyScheduleState, WeeklyPlan } from '@/domain/types'

// MOCKS
const mockRepN: Representative = {
    id: 'rep-night',
    name: 'Night Rep',
    baseShift: 'NIGHT',
    baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
    isActive: true,
    role: 'SALES',
    orderIndex: 1
}

const mockWeeklyPlan: WeeklyPlan = {
    weekStart: '2026-01-01',
    agents: [
        {
            representativeId: 'rep-night',
            days: {} // Not used by getPlannedAgentsForDay
        }
    ]
}

const makePattern = (def: DailyScheduleState, overrides: Record<number, DailyScheduleState> = {}) => {
    const p: any = {}
    for (let i = 0; i <= 6; i++) p[i] = def
    Object.assign(p, overrides)
    return p
}

const createSchedule = (pattern: DailyScheduleState): SpecialSchedule => ({
    id: 'spec-1',
    scope: 'GLOBAL',
    from: '2026-01-01',
    to: '2026-01-31',
    weeklyPattern: makePattern(pattern) as any
})

describe('🛡️ HOSTILE TESTING: getPlannedAgentsForDay', () => {

    it('MIXTO appears in BOTH DAY and NIGHT planners', () => {
        // Scenario: Rep is Base NIGHT.
        // Special Schedule: MIXTO (eligible for both).
        // Checks: Should appear when querying DAY, and when querying NIGHT.

        const mixtoSchedule = createSchedule('MIXTO')

        // 1. Query for DAY
        const dayAgents = getPlannedAgentsForDay(
            mockWeeklyPlan,
            [], // no incidents
            '2026-01-05', // Monday
            'DAY',
            [], // calendar not used for basic calc
            [mockRepN],
            [mixtoSchedule]
        )

        // 2. Query for NIGHT
        const nightAgents = getPlannedAgentsForDay(
            mockWeeklyPlan,
            [],
            '2026-01-05',
            'NIGHT',
            [],
            [mockRepN],
            [mixtoSchedule]
        )

        const inDay = dayAgents.some(a => a.representativeId === 'rep-night')
        const inNight = nightAgents.some(a => a.representativeId === 'rep-night')

        expect(inDay).toBe(true)
        expect(inNight).toBe(true)
    })
})
