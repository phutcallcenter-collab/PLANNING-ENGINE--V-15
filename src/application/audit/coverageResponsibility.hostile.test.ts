
import { createWeeklySnapshot } from './createWeeklySnapshot'
import { WeeklyPlan } from '@/domain/types'

// 🩹 MOCK INFRASTRUCTURE: nanoid es ESM, Jest es CJS. Mockeamos para evitar crash.
jest.mock('nanoid', () => ({
    nanoid: () => 'test-id-123'
}))

describe('Coverage Responsibility Invariant (Hostile)', () => {
    it('assigns absence to covering rep when coverage commitment is not executed', () => {
        /**
         * Scenario:
         * Rep A commits to cover Rep B
         * Rep A does NOT show up
         * Rep B stays off (covered expectation)
         */

        const plan: WeeklyPlan = {
            weekStart: '2026-02-02',
            agents: [
                {
                    representativeId: 'REP_A', // covering
                    days: {
                        '2026-02-02': {
                            status: 'OFF',
                            assignment: { type: 'SINGLE', shift: 'DAY' },
                            badge: 'CUBRIENDO',
                            source: 'BASE'
                        }
                    }
                },
                {
                    representativeId: 'REP_B', // owner
                    days: {
                        '2026-02-02': {
                            status: 'OFF',
                            assignment: { type: 'SINGLE', shift: 'DAY' },
                            badge: 'CUBIERTO',
                            source: 'BASE'
                        }
                    }
                }
            ]
        }

        const snapshot = createWeeklySnapshot(plan, '2026-02-02', 'TEST')

        const repA = snapshot.byRepresentative.find(r => r.repId === 'REP_A')!
        const repB = snapshot.byRepresentative.find(r => r.repId === 'REP_B')!

        // 🔥 CORE ASSERTIONS

        // Rep A failed their commitment → absence
        expect(repA.absenceSlots).toBe(1)
        expect(repA.executedSlots).toBe(0)
        expect(repA.coveringSlots).toBe(1)

        // Rep B is NOT absent
        expect(repB.absenceSlots).toBe(0)
        expect(repB.executedSlots).toBe(0)
        expect(repB.coveredSlots).toBe(0) // ✅ NOT covered (coverage failed)

        // Slot is uncovered
        expect(snapshot.totals.uncoveredSlots).toBe(1)

        // Arithmetic integrity
        expect(
            repA.executedSlots +
            repA.absenceSlots +
            repA.coveredSlots +
            repA.uncoveredSlots
        ).toBe(repA.plannedSlots)
    })

    it('does NOT assign absence when covering rep shows up', () => {
        const plan: WeeklyPlan = {
            weekStart: '2026-02-02',
            agents: [
                {
                    representativeId: 'REP_A',
                    days: {
                        '2026-02-02': {
                            status: 'WORKING', // ✅ Showed up
                            assignment: { type: 'SINGLE', shift: 'DAY' },
                            badge: 'CUBRIENDO',
                            source: 'BASE'
                        }
                    }
                },
                {
                    representativeId: 'REP_B',
                    days: {
                        '2026-02-02': {
                            status: 'OFF',
                            assignment: { type: 'SINGLE', shift: 'DAY' },
                            badge: 'CUBIERTO',
                            source: 'BASE'
                        }
                    }
                }
            ]
        }

        const snapshot = createWeeklySnapshot(plan, '2026-02-02', 'TEST')

        const repA = snapshot.byRepresentative.find(r => r.repId === 'REP_A')!
        const repB = snapshot.byRepresentative.find(r => r.repId === 'REP_B')!

        // Rep A executed their commitment → no absence
        expect(repA.absenceSlots).toBe(0)
        expect(repA.executedSlots).toBe(1)

        // Rep B is covered and not absent
        expect(repB.absenceSlots).toBe(0)
        expect(repB.coveredSlots).toBe(1) // ✅ Actually covered (executed)

        // Slot is executed
        expect(snapshot.totals.uncoveredSlots).toBe(0)
    })

    it('standard absence without coverage works as before', () => {
        const plan: WeeklyPlan = {
            weekStart: '2026-02-02',
            agents: [
                {
                    representativeId: 'REP_A',
                    days: {
                        '2026-02-02': {
                            status: 'OFF',
                            assignment: { type: 'SINGLE', shift: 'DAY' },
                            badge: 'AUSENCIA',
                            source: 'BASE'
                        }
                    }
                }
            ]
        }

        const snapshot = createWeeklySnapshot(plan, '2026-02-02', 'TEST')

        const repA = snapshot.byRepresentative.find(r => r.repId === 'REP_A')!

        // Standard absence
        expect(repA.absenceSlots).toBe(1)
        expect(repA.executedSlots).toBe(0)
        expect(repA.coveredSlots).toBe(0)
        expect(repA.coveringSlots).toBe(0)

        // Absence is counted, not uncovered
        // Invariant: Planned = Executed + Absences + Covered + Uncovered
        // 1 = 0 + 1 + 0 + 0 ✅
        expect(snapshot.totals.uncoveredSlots).toBe(0)
    })
})
