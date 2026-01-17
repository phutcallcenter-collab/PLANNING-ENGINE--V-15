import { DailyShiftCoverage } from './dailyCoverage'
import { CoverageRule } from '../types'
import { ShiftType } from '../calendar/types'
import { resolveCoverage } from './resolveCoverage'
import { DailyCoverageDeficit } from './coverageDeficit'

/**
 * ⚠️ HARDENED DEFICIT ENGINE
 *
 * Compares real coverage vs rules.
 * Produces explicit risk data.
 */
export function computeCoverageDeficit(
  coverage: DailyShiftCoverage,
  rules: CoverageRule[]
): DailyCoverageDeficit {
  const shifts: Record<ShiftType, any> = {
    DAY: null,
    NIGHT: null,
  }

  let hasRisk = false

  for (const shift of ['DAY', 'NIGHT'] as ShiftType[]) {
    const rule = resolveCoverage(coverage.date, shift, rules)

    const required = rule?.required ?? 0
    const actual = coverage.shifts[shift]
    const deficit = Math.max(0, required - actual)

    if (deficit > 0) hasRisk = true

    shifts[shift] = {
      required,
      actual,
      deficit,
    }
  }

  return {
    date: coverage.date,
    shifts,
    hasRisk,
  }
}
