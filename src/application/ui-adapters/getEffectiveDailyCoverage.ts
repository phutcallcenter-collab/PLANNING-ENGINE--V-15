import { WeeklyPlan, SwapEvent, CoverageRule, ISODate, ShiftType, Incident, Representative, SpecialSchedule } from '@/domain/types'
import { resolveCoverage } from '@/domain/planning/resolveCoverage'
import { DayInfo } from '@/domain/calendar/types'
import { getDailyShiftStats } from './getDailyShiftStats'

export type CoverageStatus = 'OK' | 'DEFICIT' | 'SURPLUS'

export interface EffectiveCoverageResult {
    actual: number
    required: number
    status: CoverageStatus
    reason?: string
}

export type DailyCoverageMap = Record<ShiftType, EffectiveCoverageResult>

/**
 * ⚠️ THIS COMPONENT DOES NOT CALCULATE LOGIC. IT CONSUMES CANONICAL STATS.
 * 
 * Calculates the effective coverage for a day using the canonical source of truth:
 * - getDailyShiftStats() for actual counts (planned & present)
 * - resolveCoverage() for requirements
 * 
 * This ensures the graph always matches the counter and list.
 */
export function getEffectiveDailyCoverage(
    weeklyPlan: WeeklyPlan,
    swaps: SwapEvent[],
    coverageRules: CoverageRule[],
    date: ISODate,
    incidents: Incident[],
    allCalendarDays: DayInfo[],
    representatives: Representative[],
    specialSchedules: SpecialSchedule[] = []
): DailyCoverageMap {
    // 🔒 CANONICAL SOURCE: getDailyShiftStats
    const dayStats = getDailyShiftStats(
        weeklyPlan,
        incidents,
        date,
        'DAY',
        allCalendarDays,
        representatives,
        specialSchedules
    )

    const nightStats = getDailyShiftStats(
        weeklyPlan,
        incidents,
        date,
        'NIGHT',
        allCalendarDays,
        representatives,
        specialSchedules
    )

    // Resolve Requirements (Rules)
    const dayReq = resolveCoverage(date, 'DAY', coverageRules)
    const nightReq = resolveCoverage(date, 'NIGHT', coverageRules)

    return {
        DAY: {
            actual: dayStats.present,
            required: dayReq.required,
            status: getStatus(dayStats.present, dayReq.required),
            reason: dayReq.reason
        },
        NIGHT: {
            actual: nightStats.present,
            required: nightReq.required,
            status: getStatus(nightStats.present, nightReq.required),
            reason: nightReq.reason
        }
    }
}

function getStatus(actual: number, required: number): CoverageStatus {
    if (actual < required) return 'DEFICIT'
    if (actual > required) return 'SURPLUS'
    return 'OK'
}
