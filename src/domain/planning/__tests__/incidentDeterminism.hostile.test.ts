
import { resolveDayStatus } from '@/domain/planning/buildWeeklySchedule'
import { Representative, DayInfo, Incident } from '@/domain/types'

describe('🛡️ HOSTILE: Deterministic Incident Selection', () => {
    const rep: Representative = {
        id: 'rep-determinism',
        name: 'Determinism Tester',
        baseShift: 'DAY',
        baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
        isActive: true,
        role: 'SALES',
        orderIndex: 0
    }

    const day: DayInfo = { date: '2026-01-01' } as any

    it('Latest OVERRIDE wins when multiple exist (deterministic)', () => {
        // Setup: Two overrides, different timestamps
        const oldOverride: Incident = {
            id: 'inc-old',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'OVERRIDE',
            assignment: { type: 'SINGLE', shift: 'DAY' },
            createdAt: '2026-01-01T08:00:00Z' // Earlier
        }

        const newOverride: Incident = {
            id: 'inc-new',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'OVERRIDE',
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            createdAt: '2026-01-01T10:00:00Z' // Later
        }

        // Test both orderings to ensure determinism
        const resultA = resolveDayStatus(rep, day, [oldOverride, newOverride], [])
        const resultB = resolveDayStatus(rep, day, [newOverride, oldOverride], [])

        // Both should select the LATEST (newOverride)
        expect(resultA.plan.assignment).toEqual({ type: 'SINGLE', shift: 'NIGHT' })
        expect(resultB.plan.assignment).toEqual({ type: 'SINGLE', shift: 'NIGHT' })
        expect(resultA.plan.source).toBe('OVERRIDE')
        expect(resultB.plan.source).toBe('OVERRIDE')
    })

    it('Latest SWAP wins when multiple exist', () => {
        const oldSwap: Incident = {
            id: 'swap-old',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'SWAP',
            assignment: { type: 'SINGLE', shift: 'DAY' },
            createdAt: '2026-01-01T09:00:00Z'
        }

        const newSwap: Incident = {
            id: 'swap-new',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'SWAP',
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            createdAt: '2026-01-01T11:00:00Z'
        }

        const result = resolveDayStatus(rep, day, [oldSwap, newSwap], [])

        expect(result.plan.assignment).toEqual({ type: 'SINGLE', shift: 'NIGHT' })
        expect(result.plan.source).toBe('SWAP')
    })
})
