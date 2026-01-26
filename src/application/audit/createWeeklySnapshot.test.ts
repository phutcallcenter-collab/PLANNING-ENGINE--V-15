import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'

// 🩹 MOCK INFRASTRUCTURE
jest.mock('nanoid', () => ({
    nanoid: () => 'test-id-123'
}))
import { createWeeklySnapshot } from './createWeeklySnapshot'
import { WeeklyPlan } from '@/domain/types'

describe('createWeeklySnapshot Invariants', () => {
    // Helper to create a minimal plan
    const createMockPlan = (daysOverrides: any = {}): WeeklyPlan => ({
        weekStart: '2026-01-19',
        agents: [
            {
                representativeId: 'TEST_REP',
                days: {
                    '2026-01-19': {
                        status: 'WORKING',
                        source: 'BASE',
                        assignment: { type: 'SINGLE', shift: 'DAY' },
                        ...daysOverrides
                    }
                }
            }
        ]
    })

    it('maintains arithmetic consistency: Planned = Executed + Absences + Covered + Uncovered', () => {
        // Case 1: Perfect Execution
        const plan1 = createMockPlan({
            status: 'WORKING',
            assignment: { type: 'SINGLE', shift: 'DAY' } // Planned
        })
        const s1 = createWeeklySnapshot(plan1, '2026-01-19', 'TEST')
        const r1 = s1.byRepresentative[0]

        // Planned: 1, Executed: 1, Absences: 0, Covered: 0, Uncovered: 0
        // 1 = 1 + 0 + 0 + 0 -> OK
        expect(r1.plannedSlots).toBe(1)
        expect(r1.executedSlots).toBe(1)
        expect(r1.uncoveredSlots).toBe(0)
        expect(r1.executedSlots + r1.absenceSlots + r1.coveredSlots + r1.uncoveredSlots).toBe(r1.plannedSlots)


        // Case 2: Absence (Covered)
        const plan2 = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Planned
            badge: 'CUBIERTO'
        })
        const s2 = createWeeklySnapshot(plan2, '2026-01-19', 'TEST')
        const r2 = s2.byRepresentative[0]

        // Planned: 1, Executed: 0, Absences: 0, Covered: 1, Uncovered: 0
        // 1 = 0 + 0 + 1 + 0 -> OK
        expect(r2.plannedSlots).toBe(1)
        expect(r2.coveredSlots).toBe(1)
        expect(r2.uncoveredSlots).toBe(0)
        expect(r2.executedSlots + r2.absenceSlots + r2.coveredSlots + r2.uncoveredSlots).toBe(r2.plannedSlots)


        // Case 3: Absence (Uncovered/Justified)
        const plan3 = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Planned
            badge: 'AUSENCIA'
        })
        const s3 = createWeeklySnapshot(plan3, '2026-01-19', 'TEST')
        const r3 = s3.byRepresentative[0]

        // Planned: 1, Executed: 0, Absences: 1, Covered: 0, Uncovered: 0 (Absence counts as 'accounted for' in this logic, but wait...)
        // Let's check logic: Uncovered = Planned - Executed - Absences - Covered
        // Uncovered = 1 - 0 - 1 - 0 = 0. Correct.
        expect(r3.plannedSlots).toBe(1)
        expect(r3.absenceSlots).toBe(1)
        expect(r3.uncoveredSlots).toBe(0)
        expect(r3.executedSlots + r3.absenceSlots + r3.coveredSlots + r3.uncoveredSlots).toBe(r3.plannedSlots)


        // Case 4: Total Abandonment (No badge, just missing)
        const plan4 = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Planned
            badge: undefined
        })
        const s4 = createWeeklySnapshot(plan4, '2026-01-19', 'TEST')
        const r4 = s4.byRepresentative[0]

        // Planned: 1, Executed: 0, Absences: 0, Covered: 0 -> Uncovered should be 1
        expect(r4.plannedSlots).toBe(1)
        expect(r4.uncoveredSlots).toBe(1)
        expect(r4.executedSlots + r4.absenceSlots + r4.coveredSlots + r4.uncoveredSlots).toBe(r4.plannedSlots)
    })

    it('detects uncovered slot correctly (explicit check)', () => {
        const plan = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' } // Planned but OFF and no Badge
        })

        const s = createWeeklySnapshot(plan, '2026-01-19', 'TEST')
        expect(s.totals.uncoveredSlots).toBe(1)
        expect(s.byRepresentative[0].uncoveredSlots).toBe(1)
    })
})
