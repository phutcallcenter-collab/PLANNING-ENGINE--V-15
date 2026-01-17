import { computeCoverageDeficit } from '../../../src/domain/planning/computeCoverageDeficit'
import { DailyShiftCoverage } from '../../../src/domain/planning/dailyCoverage'
import { CoverageRule } from '../../../src/domain/types'

describe('computeCoverageDeficit', () => {
  const coverage: DailyShiftCoverage = {
    date: '2025-02-03',
    shifts: {
      DAY: 4,
      NIGHT: 2,
    },
  }

  const rules: CoverageRule[] = [
    { id: 'day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 5 },
    { id: 'night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 2 },
  ]

  it('detects deficit correctly', () => {
    const result = computeCoverageDeficit(coverage, rules)

    expect(result.hasRisk).toBe(true)
    expect(result.shifts.DAY.deficit).toBe(1)
    expect(result.shifts.NIGHT.deficit).toBe(0)
  })

  it('reports no risk when coverage is sufficient', () => {
    const okCoverage = {
      ...coverage,
      shifts: { DAY: 5, NIGHT: 3 },
    }

    const result = computeCoverageDeficit(okCoverage, rules)

    expect(result.hasRisk).toBe(false)
    expect(result.shifts.DAY.deficit).toBe(0)
    expect(result.shifts.NIGHT.deficit).toBe(0)
  })
})
