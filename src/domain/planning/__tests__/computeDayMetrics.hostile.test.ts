
import { computeDayMetrics } from '@/domain/planning/computeDayMetrics'
import { DayPlan, DayReality } from '@/domain/planning/dayResolution'

describe('🛡️ HOSTILE: Plan vs Reality vs Computed', () => {

    it('AUSENCIA on OVERRIDE: Shows in planner, does not count for incentives', () => {
        const plan: DayPlan = {
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            source: 'OVERRIDE'
        }

        const reality: DayReality = {
            status: 'WORKING', // Semantically "was supposed to work"
            incidentType: 'AUSENCIA'
        }

        const computed = computeDayMetrics(plan, reality)

        // UI: Should appear in planner with badge
        expect(computed.display.appearsInPlanner).toBe(true)
        expect(computed.display.appearsInShifts).toContain('NIGHT')
        expect(computed.display.badge).toBe('AUSENCIA')

        // Metrics: Counts as worked (scheduled), but not for incentives
        expect(computed.metrics.countsAsWorked).toBe(true)
        expect(computed.metrics.countsForIncentives).toBe(false)
        expect(computed.metrics.countsAsAbsence).toBe(true)
    })

    it('SWAP: Appears in planner with CUBRIENDO badge', () => {
        const plan: DayPlan = {
            assignment: { type: 'SINGLE', shift: 'DAY' },
            source: 'SWAP'
        }

        const reality: DayReality = {
            status: 'WORKING'
        }

        const computed = computeDayMetrics(plan, reality)

        expect(computed.display.appearsInPlanner).toBe(true)
        expect(computed.display.appearsInShifts).toContain('DAY')
        expect(computed.display.badge).toBe('CUBRIENDO')
        expect(computed.metrics.countsForIncentives).toBe(true) // Covering is positive
    })

    it('VACATION: Disappears from planner, nothing counts', () => {
        const plan: DayPlan = {
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            source: 'BASE'
        }

        const reality: DayReality = {
            status: 'OFF',
            incidentType: 'VACACIONES'
        }

        const computed = computeDayMetrics(plan, reality)

        expect(computed.display.appearsInPlanner).toBe(false)
        expect(computed.display.appearsInShifts).toEqual([])
        expect(computed.metrics.countsAsWorked).toBe(false)
        expect(computed.metrics.countsAsAbsence).toBe(false) // Not an absence, planned time off
    })

    it('MIXTO assignment: Appears in both shifts', () => {
        const plan: DayPlan = {
            assignment: { type: 'BOTH' },
            source: 'SPECIAL'
        }

        const reality: DayReality = {
            status: 'WORKING'
        }

        const computed = computeDayMetrics(plan, reality)

        expect(computed.display.appearsInShifts).toEqual(['DAY', 'NIGHT'])
    })
})
