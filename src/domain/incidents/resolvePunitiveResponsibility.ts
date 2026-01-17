import { resolveEffectiveDuty } from '../swaps/resolveEffectiveDuty'
import { WeeklyPlan, SwapEvent, Incident, ISODate, ShiftType, DayInfo, Representative, EffectiveSchedulePeriod } from '../types'

/**
 * Determines if a representative should be punished (e.g. absent) for missing a shift.
 * Adheres strictly to the "Effective Duty" principle:
 * If you were effectively supposed to work (BASE, COVERING, DOUBLE, SWAPPED_IN) -> You are responsible.
 * If you were effectively OFF (COVERED, SWAPPED_OUT, BLOCKED) -> You are NOT responsible.
 */
export function resolvePunitiveResponsibility(
    weeklyPlan: WeeklyPlan,
    swaps: SwapEvent[],
    incidents: Incident[],
    date: ISODate,
    shift: ShiftType,
    representativeId: string,
    allCalendarDays: DayInfo[],
    representatives: Representative[],
    effectivePeriods: EffectiveSchedulePeriod[] = []
): boolean {
    const result = resolveEffectiveDuty(
        weeklyPlan,
        swaps,
        incidents,
        date,
        shift,
        representativeId,
        allCalendarDays,
        representatives,
        effectivePeriods
    )

    return result.shouldWork
}
