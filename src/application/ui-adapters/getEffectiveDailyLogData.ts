import { WeeklyPlan, SwapEvent, Incident, ISODate, ShiftType, DayInfo, Representative } from '@/domain/types'
import { resolveEffectiveDuty, EffectiveDutyResult } from '@/domain/swaps/resolveEffectiveDuty'
import { resolvePunitiveResponsibility } from '@/domain/incidents/resolvePunitiveResponsibility'

export type LogStatus =
    | 'WORKING'
    | 'COVERING'
    | 'DOUBLE'
    | 'SWAPPED_IN'
    | 'COVERED'
    | 'SWAPPED_OUT'
    | 'ABSENT'
    | 'OFF'

export interface DailyLogEntry {
    representativeId: string
    shift: ShiftType
    logStatus: LogStatus // Semantic status for the log
    isResponsible: boolean // If they miss this, do they get punished?
    details?: string
}

/**
 * Prepares data for the Daily Operational Log.
 * Flattens the day into a list of shift entries per agent, or filtered?
 * Returns ALL agents' status for both shifts for the given date.
 */
export function getEffectiveDailyLogData(
    weeklyPlan: WeeklyPlan,
    swaps: SwapEvent[],
    incidents: Incident[],
    date: ISODate,
    allCalendarDays: DayInfo[],
    representatives: Representative[]
): DailyLogEntry[] {
    const result: DailyLogEntry[] = []

    for (const agent of weeklyPlan.agents) {
        for (const shift of ['DAY', 'NIGHT'] as ShiftType[]) {
            const duty = resolveEffectiveDuty(weeklyPlan, swaps, incidents, date, shift, agent.representativeId, allCalendarDays, representatives)
            const isResponsible = resolvePunitiveResponsibility(weeklyPlan, swaps, incidents, date, shift, agent.representativeId, allCalendarDays, representatives)

            let logStatus: LogStatus = 'OFF'

            switch (duty.role) {
                case 'BASE':
                    logStatus = duty.shouldWork ? 'WORKING' : 'OFF'
                    break
                case 'COVERING':
                    logStatus = 'COVERING'
                    break
                case 'DOUBLE':
                    logStatus = 'DOUBLE'
                    break
                case 'SWAPPED_IN':
                    logStatus = 'SWAPPED_IN'
                    break
                case 'COVERED':
                    logStatus = 'COVERED'
                    break
                case 'SWAPPED_OUT':
                    logStatus = 'SWAPPED_OUT'
                    break
                case 'NONE':
                    if (duty.reason === 'AUSENCIA') {
                        logStatus = 'ABSENT'
                    } else if (duty.reason && ['VACACIONES', 'LICENCIA'].includes(duty.reason)) {
                        // People on formal leave should be OFF, not ABSENT, for this view
                        logStatus = 'OFF'
                    } else {
                        logStatus = 'OFF'
                    }
                    break
            }

            result.push({
                representativeId: agent.representativeId,
                shift,
                logStatus,
                isResponsible,
                details: duty.reason
            })
        }
    }

    return result
}
