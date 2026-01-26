
import { createWeeklySnapshot } from './createWeeklySnapshot'
import { WeeklyPlan } from '@/domain/types'

// 🩹 MOCK INFRASTRUCTURE
jest.mock('nanoid', () => ({
    nanoid: () => 'test-id-123'
}))

describe('DEBUG HOSTILE', () => {
    it('DEBUG CASE: Covering Rep Shows Up', () => {
        const plan: WeeklyPlan = {
            weekStart: '2026-02-02',
            agents: [
                {
                    representativeId: 'REP_A',
                    days: {
                        '2026-02-02': {
                            status: 'WORKING',
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

        const representatives = [
            { id: 'REP_A', name: 'Rep A' },
            { id: 'REP_B', name: 'Rep B' }
        ]

        const mockCoverage = {
            id: 'cov-hostile',
            date: '2026-02-02',
            shift: 'DAY',
            coveredRepId: 'REP_B',
            coveringRepId: 'REP_A',
            status: 'ACTIVE'
        }

        const snapshot = createWeeklySnapshot(plan, '2026-02-02', 'TEST', [mockCoverage as any], representatives as any)

        console.log('SNAPSHOT TOTALS:', JSON.stringify(snapshot.totals, null, 2))
        console.log('AGENTS:', JSON.stringify(snapshot.byRepresentative, null, 2))

        const repB = snapshot.byRepresentative.find(r => r.repId === 'REP_B')!

        // Assertion that failed
        expect(repB.coveredSlots).toBe(1)
    })
})
