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

    it('Case 1: Perfect Execution', () => {
        const plan1 = createMockPlan({
            status: 'WORKING',
            assignment: { type: 'SINGLE', shift: 'DAY' } // Planned
        })
        const s1 = createWeeklySnapshot(plan1, '2026-01-19', 'TEST', [], [])
        const r1 = s1.byRepresentative[0]

        // Planned: 1, Executed: 1, Absences: 0, Covered: 0, Uncovered: 0
        expect(r1.plannedSlots).toBe(1)
        expect(r1.executedSlots).toBe(1)
        expect(r1.uncoveredSlots).toBe(0)
        expect(r1.executedSlots + r1.absenceSlots + r1.coveredSlots + r1.uncoveredSlots).toBe(r1.plannedSlots)
    })

    it('Case 2: Absence (Covered)', () => {
        const plan2 = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Planned
            badge: 'CUBIERTO'
        })

        // Add Covering Rep to plan (WORKING)
        plan2.agents.push({
            representativeId: 'COVER_REP',
            days: {
                '2026-01-19': {
                    status: 'WORKING', // Successful coverage
                    source: 'BASE',
                    assignment: { type: 'NONE' }
                }
            }
        })

        const mockCoverage = {
            id: 'cov-1',
            date: '2026-01-19',
            shift: 'DAY',
            coveredRepId: 'TEST_REP', // Alice
            coveringRepId: 'COVER_REP', // Bob
            status: 'ACTIVE'
        }
        const mockCoveringRep = { id: 'COVER_REP', name: 'Bob' }

        // We pass the coverage and the covering rep
        const s2 = createWeeklySnapshot(plan2, '2026-01-19', 'TEST', [mockCoverage as any], [mockCoveringRep as any])
        const r2 = s2.byRepresentative[0]

        // Planned: 1, Executed: 0, Absences: 0, Covered: 1, Uncovered: 0
        expect(r2.plannedSlots).toBe(1)
        expect(r2.coveredSlots).toBe(1)
        expect(r2.uncoveredSlots).toBe(0)
        expect(r2.executedSlots + r2.absenceSlots + r2.coveredSlots + r2.uncoveredSlots).toBe(r2.plannedSlots)
    })

    it('Case 3: Absence (Uncovered/Justified)', () => {
        const plan3 = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Planned
            badge: 'AUSENCIA'
        })
        const s3 = createWeeklySnapshot(plan3, '2026-01-19', 'TEST', [], [])
        const r3 = s3.byRepresentative[0]

        // Planned: 1, Executed: 0, Absences: 1, Covered: 0
        expect(r3.plannedSlots).toBe(1)
        expect(r3.absenceSlots).toBe(1)
        expect(r3.uncoveredSlots).toBe(0)
        expect(r3.executedSlots + r3.absenceSlots + r3.coveredSlots + r3.uncoveredSlots).toBe(r3.plannedSlots)
    })

    it('Case 4: Total Abandonment (No badge, just missing)', () => {
        const plan4 = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Planned
            badge: undefined
        })
        const s4 = createWeeklySnapshot(plan4, '2026-01-19', 'TEST', [], [])
        const r4 = s4.byRepresentative[0]

        // Planned: 1, Executed: 0, Absences: 1, Covered: 0 -> Uncovered should be 0 (It's an Absence)
        expect(r4.plannedSlots).toBe(1)
        expect(r4.absenceSlots).toBe(1)
        expect(r4.uncoveredSlots).toBe(0)
        expect(r4.executedSlots + r4.absenceSlots + r4.coveredSlots + r4.uncoveredSlots).toBe(r4.plannedSlots)
    })

    it('detects absence correctly (no badge)', () => {
        const plan = createMockPlan({
            status: 'OFF',
            assignment: { type: 'SINGLE', shift: 'DAY' } // Planned but OFF and no Badge
        })

        const s = createWeeklySnapshot(plan, '2026-01-19', 'TEST', [], [])
        // Expect Absence, not Uncovered, as resolveSlotResponsibility returns BASE for unbadged off days
        expect(s.totals.absenceSlots).toBe(1)
        expect(s.byRepresentative[0].absenceSlots).toBe(1)
        expect(s.totals.uncoveredSlots).toBe(0)
    })
})
