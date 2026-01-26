import { getDailyShiftStats } from './getDailyShiftStats'
import { ShiftType } from '@/domain/types'

// Simple mock factories
const createRep = (id: string) => ({ id, name: id, role: 'SALES', isActive: true, baseShift: 'DAY', baseSchedule: {}, orderIndex: 0 } as any)
const createPlan = (repId: string, date: string, shift: string) => ({
    agents: [{
        representativeId: repId,
        days: { [date]: { shift } }
    }]
} as any)

describe('getDailyShiftStats (Operational Reality)', () => {
    const LUZ = createRep('LUZ')
    const EMELY = createRep('EMELY')
    const reps = [LUZ, EMELY]
    const date = '2025-01-20'
    const shift = 'DAY'
    // Plan: Luz is working DAY. Emely is NOT working (implied).
    const weeklyPlan = createPlan('LUZ', date, 'DAY')

    it('counts present when no incidents exist', () => {
        const stats = getDailyShiftStats(weeklyPlan, [], date, shift, [], reps)
        expect(stats.planned).toBe(1)
        expect(stats.present).toBe(1)
    })

    it('reduces capacity for direct absence (Standard)', () => {
        const incidents: any[] = [{
            type: 'AUSENCIA',
            representativeId: 'LUZ',
            startDate: date
        }]
        const stats = getDailyShiftStats(weeklyPlan, incidents, date, shift, [], reps)
        expect(stats.planned).toBe(1)
        expect(stats.present).toBe(0) // Logic correct
    })

    it('reduces capacity for coverage failure (The Final Invariant)', () => {
        // SCENARIO: 
        // Slot belongs to LUZ.
        // Emely was covering but failed.
        // Incident is assigned to Emely (Disciplinary truth).
        const incidents: any[] = [{
            type: 'AUSENCIA',
            representativeId: 'EMELY', // Reponsible person
            startDate: date,
            source: 'COVERAGE',
            slotOwnerId: 'LUZ'         // Slot owner affected
        }]

        const stats = getDailyShiftStats(weeklyPlan, incidents, date, shift, [], reps)

        expect(stats.planned).toBe(1) // Slot still exists
        expect(stats.present).toBe(0) // Slot is operationally empty
    })

    it('does NOT reduce capacity for unrelated absence', () => {
        // SCENARIO: Emely is absent on her own slot (if she had one) or random logic
        // But here we check if Emely's Direct Absence affects Luz's Slot? 
        // No, unless Emely was covering Luz (checked above) or Emely IS Luz.
        // Here Emely has a direct absence but is NOT covering Luz (no slotOwnerId link to Luz).

        const incidents: any[] = [{
            type: 'AUSENCIA',
            representativeId: 'EMELY',
            startDate: date
            // No slotOwnerId linking to LUZ
        }]

        const stats = getDailyShiftStats(weeklyPlan, incidents, date, shift, [], reps)
        expect(stats.planned).toBe(1)
        expect(stats.present).toBe(1) // Luz is still present
    })
})
