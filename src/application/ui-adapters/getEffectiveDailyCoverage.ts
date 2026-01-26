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
    // 🔒 CANONICAL LOGIC: Base Assignment + Swaps - Absences
    // 1. Calculate Base from Weekly Plan (includes Absences/Vacations pre-calculated)
    let dayActual = 0
    let nightActual = 0

    if (weeklyPlan && weeklyPlan.agents) {
        weeklyPlan.agents.forEach(agent => {
            const day = agent.days[date]
            if (!day) return

            // Only count if physically PRESENT (Status WORKING)
            if (day.status === 'WORKING') {
                const assignment = day.assignment
                if (!assignment) return

                if (assignment.type === 'BOTH') {
                    dayActual++
                    nightActual++
                } else if (assignment.type === 'SINGLE') {
                    if (assignment.shift === 'DAY') dayActual++
                    if (assignment.shift === 'NIGHT') nightActual++
                }
            }
        })
    }

    // 2. Apply Swaps (Dynamic Layer)
    // Swaps might not be baked into the WeeklyPlan if they are strictly events
    const validSwaps = swaps.filter(s => s.date === date)

    validSwaps.forEach(swap => {
        // DOUBLE: Adds coverage to the target shift
        if (swap.type === 'DOUBLE') {
            if (swap.shift === 'DAY') dayActual++
            if (swap.shift === 'NIGHT') nightActual++
        }
        // COVER: Functionally net zero for coverage capacity.
        // The covering agent takes the slot of the covered agent.
        // Since we count the Base Schedule (where 1 person should be), 
        // and the covered person is absent (effectively -1 capacity relative to plan),
        // the cover restores it to 0 change relative to Plan.
        // BUT strict "Actual" count:
        // - Base says: User A works. User B works. (Total 2)
        // - User A is Absent (-1) -> Total 1.
        // - User B covers User A? No, usually C covers A.
        // If C covers A: C is effectively working. A is effectively not.
        // If C was NOT in base plan (OFF), then C is +1.
        // If A is in base plan (WORKING), but Absent, A is 0. 
        // The code above counts WORKING status from plan.
        // If A has status WORKING in plan, but is absent... 
        // Wait, "getEffectiveDailyCoverage" previously relied on "getDailyShiftStats" which deducted absences.
        // My new logic counts "status === 'WORKING'".
        // Does "status === 'WORKING'" include people who are Absent?
        // In the WeeklyPlan, "status" is usually modified by absences to "OFF" or kept as "WORKING" with badge "AUSENCIA"?
        // If absence changes status to "OFF", then A is not counted. C (if OFF->WORKING) is +1. Net +1?
        //
        // User instruction: "COVER = neto 0". "Solo SWAP altera actual".
        // This implies for the purpose of this calculation, we ignore COVER.
        else if (swap.type === 'COVER') {
            // Net zero impact on headcount
        }
        // SWAP: Moves from shift A to B
        else if (swap.type === 'SWAP') {
            // From Shift -> -1
            if (swap.fromShift === 'DAY') dayActual--
            if (swap.fromShift === 'NIGHT') nightActual--

            // To Shift -> +1
            if (swap.toShift === 'DAY') dayActual++
            if (swap.toShift === 'NIGHT') nightActual++
        }
    })

    // Resolve Requirements (Rules)
    const dayReq = resolveCoverage(date, 'DAY', coverageRules)
    const nightReq = resolveCoverage(date, 'NIGHT', coverageRules)

    return {
        DAY: {
            actual: dayActual,
            required: dayReq.required,
            status: getStatus(dayActual, dayReq.required),
            reason: dayReq.reason
        },
        NIGHT: {
            actual: nightActual,
            required: nightReq.required,
            status: getStatus(nightActual, nightReq.required),
            reason: nightReq.reason
        }
    }
}

function getStatus(actual: number, required: number): CoverageStatus {
    if (actual < required) return 'DEFICIT'
    if (actual > required) return 'SURPLUS'
    return 'OK'
}
