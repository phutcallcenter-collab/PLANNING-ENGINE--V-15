import { WeeklyPlan, SwapEvent, Incident, ISODate, ShiftType, Representative, SpecialSchedule } from '@/domain/types'
import { resolveEffectiveDuty, EffectiveDutyResult } from '@/domain/swaps/resolveEffectiveDuty'
import { DayInfo } from '@/domain/calendar/types'

// Map: RepId -> Date -> Shift -> Result
export type PlannerAssignmentsMap = Record<
    string, // RepresentativeId
    Record<
        ISODate,
        Record<ShiftType, EffectiveDutyResult>
    >
>

/**
 * Transforms domain data into a semantic grid structure for the Planner UI.
 * Pure transformation. No UI logic.
 */
export function getEffectiveAssignmentsForPlanner(
    weeklyPlan: WeeklyPlan,
    swaps: SwapEvent[],
    incidents: Incident[],
    allCalendarDays: DayInfo[],
    representatives: Representative[],
    specialSchedules: SpecialSchedule[] = []
): PlannerAssignmentsMap {
    const result: PlannerAssignmentsMap = {}

    for (const agent of weeklyPlan.agents) {
        result[agent.representativeId] = {}

        // Iterate over days present in the agent's plan
        // Or should we iterate over a specific date range? 
        // The WeeklyPlan usually covers a week.
        const dates = Object.keys(agent.days) as ISODate[]

        for (const date of dates) {
            result[agent.representativeId][date] = {
                DAY: resolveEffectiveDuty(
                    weeklyPlan,
                    swaps,
                    incidents,
                    date,
                    'DAY',
                    agent.representativeId,
                    allCalendarDays,
                    representatives,
                    specialSchedules
                ),
                NIGHT: resolveEffectiveDuty(
                    weeklyPlan,
                    swaps,
                    incidents,
                    date,
                    'NIGHT',
                    agent.representativeId,
                    allCalendarDays,
                    representatives,
                    specialSchedules
                )
            }
        }
    }

    return result
}
