
import { resolveWeeklyPatternSnapshot } from '@/application/scheduling/resolveWeeklyPatternSnapshot'
import { Representative } from '@/domain/types'

describe('🛡️ HOSTILE: Snapshot Resolution at Save', () => {

    // Mock Representative
    const mockRep: Representative = {
        id: 'rep-test',
        name: 'Test Rep',
        baseShift: 'NIGHT', // Base Shift is NIGHT
        baseSchedule: {
            0: 'OFF',       // Sunday: OFF (Explicit priority over baseShift)
            1: 'WORKING',   // Monday: NIGHT
            2: 'WORKING',   // Tuesday: NIGHT
            3: 'WORKING',   // Wednesday: NIGHT
            4: 'WORKING',   // Thursday: NIGHT
            5: 'WORKING',   // Friday: NIGHT
            6: 'OFF'        // Saturday: OFF
        },
        isActive: true,
        role: 'SALES',
        orderIndex: 0
    }

    it('Resolves BASE_REF to EXPLICIT states (Freezes history)', () => {
        // UI State: All BASE_REF
        const uiState: any[] = Array(7).fill('BASE_REF')

        const resolved = resolveWeeklyPatternSnapshot(mockRep, uiState)

        // Sunday(0) was OFF in baseSchedule -> should be OFF
        expect(resolved[0]).toBe('OFF')

        // Monday(1) was WORKING in baseSchedule + BaseShift NIGHT -> should be NIGHT
        expect(resolved[1]).toBe('NIGHT')

        // It should NOT contain 'BASE_REF' string
        Object.values(resolved).forEach(val => {
            expect(val).not.toBe('BASE_REF')
            expect(['OFF', 'DAY', 'NIGHT', 'MIXTO']).toContain(val)
        })
    })

    it('Preserves Explicit Edits (Overrides Base)', () => {
        // UI State: Mostly BASE_REF, but Monday explicit DAY
        const uiState: any[] = Array(7).fill('BASE_REF')
        uiState[1] = 'DAY' // Override Monday to DAY

        const resolved = resolveWeeklyPatternSnapshot(mockRep, uiState)

        expect(resolved[1]).toBe('DAY') // Explicit wins
        expect(resolved[2]).toBe('NIGHT') // Base resolved for touched day
    })

    it('Handles Base Change Simulation (History Freeze)', () => {
        // Scenario: We resolve now. Then Base changes. The resolution remains fixed.
        // This is implicit in the design (return value is independent), 
        // but we verify the function is pure output.

        const uiState: any[] = ['BASE_REF', 'BASE_REF', 'BASE_REF', 'BASE_REF', 'BASE_REF', 'BASE_REF', 'BASE_REF']

        const snapshot1 = resolveWeeklyPatternSnapshot(mockRep, uiState)

        // Mutate Rep (Simulate Future Base Change)
        const mutatedRep = { ...mockRep, baseShift: 'DAY' as const }

        const snapshot2 = resolveWeeklyPatternSnapshot(mutatedRep, uiState)

        // Snapshot 1 should be NIGHT (from mockRep)
        expect(snapshot1[1]).toBe('NIGHT')

        // Snapshot 2 should be DAY (from mutatedRep) - confirming it reads current state
        // BUT the point is that the STORED value (snapshot1) is now just a plain object 
        // that won't change even if we use it later.
        expect(snapshot2[1]).toBe('DAY')

        // Verify snapshot1 was fully materialized
        expect(snapshot1).toEqual({
            0: 'OFF', 1: 'NIGHT', 2: 'NIGHT', 3: 'NIGHT', 4: 'NIGHT', 5: 'NIGHT', 6: 'OFF'
        })
    })
})
