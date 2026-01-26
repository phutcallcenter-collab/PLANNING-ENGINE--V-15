
import { computeDayMetrics } from '@/domain/planning/computeDayMetrics'
import { DayPlan, DayReality } from '@/domain/planning/dayResolution'
import { CoverageLookup } from '@/domain/planning/coverage'

describe('🛡️ HOSTILE: Coverage Badge Integration', () => {

    it('🔥 CUBIERTO: Person stays in planner, gets badge', () => {
        const plan: DayPlan = {
            assignment: { type: 'SINGLE', shift: 'DAY' },
            source: 'BASE'
        }

        const reality: DayReality = {
            status: 'WORKING'
        }

        const coverage: CoverageLookup = {
            isCovered: true,
            isCovering: false,
            coveredBy: {
                repId: 'rep-covering',
                shift: 'DAY',
                coverageId: 'cov-1'
            }
        }

        const computed = computeDayMetrics(plan, reality, coverage)

        // ✅ Person does NOT disappear
        expect(computed.display.appearsInPlanner).toBe(true)

        // ✅ Person does NOT pass to OFF
        expect(computed.display.appearsInShifts).toContain('DAY')

        // ✅ Badge shows coverage
        expect(computed.display.badge).toBe('CUBIERTO')

        // ✅ Incentives still count
        expect(computed.metrics.countsForIncentives).toBe(true)
    })

    it('🔥 CUBRIENDO: Person stays in their shift, gets badge', () => {
        const plan: DayPlan = {
            assignment: { type: 'SINGLE', shift: 'NIGHT' },
            source: 'BASE'
        }

        const reality: DayReality = {
            status: 'WORKING'
        }

        const coverage: CoverageLookup = {
            isCovered: false,
            isCovering: true,
            covering: {
                repId: 'rep-covered',
                shift: 'DAY',
                coverageId: 'cov-1'
            }
        }

        const computed = computeDayMetrics(plan, reality, coverage)

        // ✅ Person does NOT move to DAY shift
        expect(computed.display.appearsInShifts).toEqual(['NIGHT'])

        // ✅ Badge shows they're covering
        expect(computed.display.badge).toBe('CUBRIENDO')

        // ✅ Covering counts positively
        expect(computed.metrics.countsForIncentives).toBe(true)
    })

    it('🔥 AUSENCIA takes priority over CUBIERTO badge', () => {
        const plan: DayPlan = {
            assignment: { type: 'SINGLE', shift: 'DAY' },
            source: 'BASE'
        }

        const reality: DayReality = {
            status: 'WORKING',
            incidentType: 'AUSENCIA'
        }

        const coverage: CoverageLookup = {
            isCovered: true,
            isCovering: false,
            coveredBy: {
                repId: 'rep-covering',
                shift: 'DAY',
                coverageId: 'cov-1'
            }
        }

        const computed = computeDayMetrics(plan, reality, coverage)

        // ✅ AUSENCIA badge has priority
        expect(computed.display.badge).toBe('AUSENCIA')

        // ✅ Still appears in planner
        expect(computed.display.appearsInPlanner).toBe(true)
    })
})
