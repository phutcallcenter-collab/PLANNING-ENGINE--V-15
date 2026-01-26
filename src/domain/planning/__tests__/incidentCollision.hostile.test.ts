
import { buildWeeklySchedule, resolveDayStatus } from '@/domain/planning/buildWeeklySchedule'
import { Representative, DayInfo, Incident, SpecialSchedule } from '@/domain/types'

describe('🛡️ HOSTILE: Incident Collision & Precedence', () => {
    const rep: Representative = {
        id: 'rep-collision',
        name: 'Collision Tester',
        baseShift: 'DAY',
        baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
        isActive: true,
        role: 'SALES',
        orderIndex: 0
    }

    const day: DayInfo = { date: '2026-01-01' } as any

    it('MONSTER CHECK: OVERRIDE + AUSENCIA + SWAP do not clobber each other', () => {
        // 1. Setup: Override to NIGHT (Priority 1 Assignment)
        const override: Incident = {
            id: 'inc-override',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'OVERRIDE',
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            createdAt: new Date().toISOString()
        }

        // 2. Setup: Ausencia (Condition Overlay)
        const absence: Incident = {
            id: 'inc-absence',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'AUSENCIA',
            createdAt: new Date().toISOString()
        }

        // 3. Setup: Swap (Priority 2 Assignment - Should be ignored due to Override)
        const swap: Incident = {
            id: 'inc-swap',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'SWAP',
            assignment: { type: 'SINGLE', shift: 'DAY' }, // Conflicting assignment
            metadata: { coveredBy: 'rep-2' },
            createdAt: new Date().toISOString()
        }

        // 4. Execution: Pass all three
        const result = resolveDayStatus(
            rep,
            day,
            [override, absence, swap], // Random order shouldn't matter but passed as set
            []
        )

        // 5. Expectation:
        // Assignment: NIGHT (Override > Swap)
        // Type: AUSENCIA (Condition overlays Assignment)
        // Source: OVERRIDE (Primary assignment source)

        expect(result.plan.assignment).toEqual({ type: 'SINGLE', shift: 'NIGHT' })
        expect(result.reality.incidentType).toBe('AUSENCIA')
        expect(result.plan.source).toBe('OVERRIDE')
    })

    it('SWAP wins over Base/Special if no Override', () => {
        // Setup: Swap to NIGHT
        const swap: Incident = {
            id: 'inc-swap-only',
            representativeId: rep.id,
            startDate: '2026-01-01',
            duration: 1,
            type: 'SWAP',
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            createdAt: new Date().toISOString()
        }

        const result = resolveDayStatus(
            rep,
            day,
            [swap],
            []
        )

        expect(result.plan.assignment).toEqual({ type: 'SINGLE', shift: 'NIGHT' })
        expect(result.plan.source).toBe('SWAP') // New source type
    })
})
