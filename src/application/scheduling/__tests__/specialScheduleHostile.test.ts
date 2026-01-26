

import { getEffectiveSchedule } from '../specialScheduleAdapter'
import { Representative, SpecialSchedule, DailyScheduleState } from '@/domain/types'

// MOCKS
const mockRep: Representative = {
    id: 'rep-1',
    name: 'Test Rep',
    baseShift: 'DAY',
    baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' }, // Mon-Fri
    isActive: true,
    role: 'SALES',
    orderIndex: 1
}

const baseSchedule = mockRep.baseSchedule

function createPatternSchedule(
    id: string,
    scope: SpecialSchedule['scope'],
    pattern: Record<number, DailyScheduleState>,
    period: string[], // [from, to]
    targetId?: string
): SpecialSchedule {
    return {
        id,
        scope,
        targetId,
        from: period[0],
        to: period[1],
        weeklyPattern: pattern as any // casting for simplicity in test helper
    }
}

// Helper to create a full week pattern
const makePattern = (def: DailyScheduleState, overrides: Record<number, DailyScheduleState> = {}) => {
    const p: any = {}
    for (let i = 0; i <= 6; i++) p[i] = def
    Object.assign(p, overrides)
    return p
}

describe('🛡️ HOSTILE TESTING: Explicit Weekly Pattern', () => {

    it('1.1 Explicit Lookup: Individual > Global', () => {
        // Global: All NIGHT
        // Individual: All OFF

        const globalSched = createPatternSchedule('global', 'GLOBAL', makePattern('NIGHT'), ['2026-01-01', '2026-01-31'])
        const indSched = createPatternSchedule('ind', 'INDIVIDUAL', makePattern('OFF'), ['2026-01-01', '2026-01-31'], 'rep-1')

        const result = getEffectiveSchedule({
            representative: mockRep,
            dateStr: '2026-01-05', // Monday
            baseSchedule,
            specialSchedules: [globalSched, indSched]
        })

        expect(result.type).toBe('OFF')
        expect(result.source?.id).toBe('ind')
    })

    it('2.1 MIXTO Overrides Base OFF (User Request Scenario)', () => {
        // Base: OFF on Sunday (0)
        // Explicit Pattern: MIXTO on Sunday
        // Expected: MIXTO (Because it's explicit)

        const explicitMixto = createPatternSchedule('mix-sun', 'GLOBAL', makePattern('OFF', { 0: 'MIXTO' }), ['2026-01-01', '2026-01-31'])

        const result = getEffectiveSchedule({
            representative: mockRep,
            dateStr: '2026-01-04', // Sunday
            baseSchedule,
            specialSchedules: [explicitMixto]
        })

        // PREVIOUSLY: Would be OFF (Subordination)
        // NOW: Must be MIXTO (Explicit Agreement)
        expect(result.type).toBe('MIXTO')
    })

    it('2.2 Base OFF maintained if Explicit Pattern says OFF', () => {
        // Base: WORKING (Monday) -> mockRep has baseShift DAY
        // Explicit Pattern: OFF

        // We use DAY as the "default" for the pattern in this test to show that 
        // effectively checking it overrides the base even if we populated it with something else elsewhere
        // But specifically for Monday (1), we set it to OFF.
        const explicitOff = createPatternSchedule('off-mon', 'GLOBAL', makePattern('DAY', { 1: 'OFF' }), ['2026-01-01', '2026-01-31'])

        const result = getEffectiveSchedule({
            representative: mockRep,
            dateStr: '2026-01-05', // Monday
            baseSchedule,
            specialSchedules: [explicitOff]
        })

        expect(result.type).toBe('OFF')
    })

    it('3.1 Explicit DAY/NIGHT Assignment', () => {
        // Explicitly assigning NIGHT to a DAY agent
        const nightWeek = createPatternSchedule('night-week', 'GLOBAL', makePattern('NIGHT'), ['2026-01-01', '2026-01-07'])

        const result = getEffectiveSchedule({
            representative: mockRep,
            dateStr: '2026-01-05',
            baseSchedule,
            specialSchedules: [nightWeek]
        })

        expect(result.type).toBe('OVERRIDE')
        expect(result.shift).toBe('NIGHT')
    })

    it('4.1 Pattern Boundary Check', () => {
        // Schedule ends on 20th
        const sched = createPatternSchedule('range', 'GLOBAL', makePattern('OFF'), ['2026-01-10', '2026-01-20'])

        // 20th -> OFF
        expect(getEffectiveSchedule({ representative: mockRep, dateStr: '2026-01-20', baseSchedule, specialSchedules: [sched] }).type).toBe('OFF')

        // 21st -> BASE (Working)
        expect(getEffectiveSchedule({ representative: mockRep, dateStr: '2026-01-21', baseSchedule, specialSchedules: [sched] }).type).toBe('BASE')
    })

    it('5.1 Individual Overrides Global (Overlapping Dates)', () => {
        // Global: Enero-Marzo (OFF)
        // Individual: Febrero (DAY)
        // Date: Feb 15

        const globalOff = createPatternSchedule('global-off', 'GLOBAL', makePattern('OFF'), ['2026-01-01', '2026-03-31'])
        const indDay = createPatternSchedule('ind-day', 'INDIVIDUAL', makePattern('DAY'), ['2026-02-01', '2026-02-28'], 'rep-1')

        const result = getEffectiveSchedule({
            representative: mockRep,
            dateStr: '2026-02-15',
            baseSchedule,
            specialSchedules: [globalOff, indDay]
        })

        expect(result.type).toBe('OVERRIDE')
        expect(result.shift).toBe('DAY')
        expect(result.source?.id).toBe('ind-day')
    })

    it('6.1 Snapshot Immutability (Base Change does not affect Explicit)', () => {
        // Scenario: 
        // 1. Created Special Schedule for explicit 'DAY' (Snapshot of base at that time)
        // 2. Later, Rep base shift changes to 'NIGHT'
        // 3. Special Schedule should still return 'DAY' because it was explicitly saved as such.

        // Note: The "Snapshot" happens at the Wizard level (UI saving to Store). 
        // The Store saves the explicit pattern. 
        // So the Adapter just reads the pattern.
        // This test confirms that the Adapter DOES NOT check rep.baseShift if an explicit pattern exists.

        const explicitDay = createPatternSchedule('saved-day', 'INDIVIDUAL', makePattern('DAY'), ['2026-01-01', '2026-01-31'], 'rep-1')

        // Mutate the rep to simulate a profile change
        const nightRep = { ...mockRep, baseShift: 'NIGHT' as const }

        const result = getEffectiveSchedule({
            representative: nightRep,
            dateStr: '2026-01-10',
            baseSchedule, // irrelevant for explicit
            specialSchedules: [explicitDay]
        })

        expect(result.type).toBe('OVERRIDE')
        expect(result.shift).toBe('DAY') // Should NOT be NIGHT
    })

    it('7.1 Legacy/Corrupted Data Ignore', () => {
        // Scenario: A legacy SpecialSchedule exists in the store (missing weeklyPattern).
        // The adapter should log an error (console.error mocked or ignored) and return BASE/OFF.
        // It must NOT crash.

        const legacy = {
            id: 'legacy-crash',
            scope: 'GLOBAL',
            from: '2026-01-01',
            to: '2026-01-31',
            // NO weeklyPattern
        } as any

        const result = getEffectiveSchedule({
            representative: mockRep,
            dateStr: '2026-01-05', // Monday (Working)
            baseSchedule,
            specialSchedules: [legacy]
        })

        // Should fall back to BASE
        expect(result.type).toBe('BASE')
    })
})
