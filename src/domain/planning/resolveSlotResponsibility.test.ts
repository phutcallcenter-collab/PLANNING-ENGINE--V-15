import { resolveSlotResponsibility } from './resolveSlotResponsibility'
import { ShiftType } from '../calendar/types'
import { Representative } from '../types'

// Mock data helpers
const createRep = (id: string, name: string): Representative => ({
    id,
    name,
    role: 'SALES',
    isActive: true,
    baseShift: 'DAY',
    baseSchedule: {},
    orderIndex: 0
})

const date = '2025-01-20'

describe('resolveSlotResponsibility', () => {
    const luz = createRep('LUZ', 'Luz Maria')
    const emely = createRep('EMELY', 'Emely')
    const representatives = [luz, emely]

    it('resolves to clicked rep when no coverage exists (BASE)', () => {
        const weeklyPlan: any = {
            agents: [{
                representativeId: 'LUZ',
                days: { [date]: { badge: undefined } }
            }]
        }

        const result = resolveSlotResponsibility(
            'LUZ', date, 'DAY', weeklyPlan, [], representatives
        )

        expect(result).toMatchObject({
            kind: 'RESOLVED',
            targetRepId: 'LUZ',
            slotOwnerId: 'LUZ',
            source: 'BASE'
        })
    })

    it('resolves to covering rep when coverage exists (regardless of badge)', () => {
        // 🧠 CRITICAL FIX VERIFICATION: Even if badge is undefined or missing
        const weeklyPlan: any = {
            agents: [{
                representativeId: 'LUZ',
                days: { [date]: { badge: undefined } }
            }]
        }

        const coverages: any[] = [{
            status: 'ACTIVE',
            date,
            shift: 'DAY',
            coveredRepId: 'LUZ',
            coveringRepId: 'EMELY'
        }]

        const result = resolveSlotResponsibility(
            'LUZ', date, 'DAY', weeklyPlan, coverages, representatives
        )

        expect(result).toMatchObject({
            kind: 'RESOLVED',
            targetRepId: 'EMELY', // The responsible one
            slotOwnerId: 'LUZ',   // The owner
            source: 'COVERAGE'
        })
    })

    it('resolves to UNASSIGNED when badge is CUBIERTO but no coverage exists', () => {
        const weeklyPlan: any = {
            agents: [{
                representativeId: 'LUZ',
                days: { [date]: { badge: 'CUBIERTO' } }
            }]
        }

        const result = resolveSlotResponsibility(
            'LUZ', date, 'DAY', weeklyPlan, [], representatives
        )

        expect(result).toMatchObject({
            kind: 'UNASSIGNED',
            reason: 'COVERAGE_FAILED'
        })
    })

    it('resolves to UNASSIGNED when plan data is missing', () => {
        const weeklyPlan: any = { agents: [] }

        const result = resolveSlotResponsibility(
            'LUZ', date, 'DAY', weeklyPlan, [], representatives
        )

        expect(result).toMatchObject({
            kind: 'UNASSIGNED',
            reason: 'NO_RESPONSIBLE'
        })
    })
})
