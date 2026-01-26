import { Representative, DailyScheduleState, SpecialSchedule } from '@/domain/types'

type UiDayState = DailyScheduleState | 'BASE_REF'

/**
 * 🟢 CANONICAL SNAPSHOT RESOLVER
 * 
 * Transforms the UI state (which may contain references to 'BASE') 
 * into a fully explicit, immutable pattern for storage.
 * 
 * "Freezes" history at the moment of saving.
 */
export function resolveWeeklyPatternSnapshot(
    rep: Representative,
    dayStates: UiDayState[]
): SpecialSchedule['weeklyPattern'] {
    const explicitPattern: Partial<SpecialSchedule['weeklyPattern']> = {}

    dayStates.forEach((state, index) => {
        if (state === 'BASE_REF') {
            // RESOLVE: Look up the CURRENT base schedule and freeze it.
            const baseStatus = rep.baseSchedule[index as 0 | 1 | 2 | 3 | 4 | 5 | 6]
            if (baseStatus === 'OFF') {
                explicitPattern[index as 0 | 1 | 2 | 3 | 4 | 5 | 6] = 'OFF'
            } else {
                explicitPattern[index as 0 | 1 | 2 | 3 | 4 | 5 | 6] = rep.baseShift
            }
        } else {
            // KEEP: Already explicit
            explicitPattern[index as 0 | 1 | 2 | 3 | 4 | 5 | 6] = state
        }
    })

    return explicitPattern as SpecialSchedule['weeklyPattern']
}
