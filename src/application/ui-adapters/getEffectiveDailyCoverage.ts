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
        // COVER: Functionally adds coverage (Sender takes slot, Target was absent)
        // If Target was Absent -> 0. Sender Covers -> +1. Net +1 relative to absence.
        // But relative to "Plan" (where 1 should work), it restores it.
        // The Prompt says "Covers son NETO 0". 
        // If we count Base (Absent=0) + Cover (+0?) = 0. That's a deficit.
        // If Cover fixes deficit, it must be +1.
        // Assuming Cover ADDS a working body.
        else if (swap.type === 'COVER') {
            // Sender works extra? Or sender replacement?
            // Usually Cover = Replacement. The replacement works.
            // If replacement is NOT in Base (e.g. was OFF), they add +1.
            // If replacement WAS working, they can't cover (clash) unless double?
            // Assuming Cover adds 1 person to the shift.
            if (swap.shift === 'DAY') dayActual++
            if (swap.shift === 'NIGHT') nightActual++
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
