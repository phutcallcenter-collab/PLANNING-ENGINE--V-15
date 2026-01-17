import { WeeklyPlan, SwapEvent, CoverageRule, ISODate, ShiftType, Incident, Representative } from '@/domain/types'
import { resolveCoverage } from '@/domain/planning/resolveCoverage'
import { applySwapsToCoverage } from '@/domain/planning/applySwapsToCoverage'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { DayInfo } from '@/domain/calendar/types'

export type CoverageStatus = 'OK' | 'DEFICIT' | 'SURPLUS'

export interface EffectiveCoverageResult {
    actual: number
    required: number
    status: CoverageStatus
    reason?: string
}

export type DailyCoverageMap = Record<ShiftType, EffectiveCoverageResult>

/**
 * 🔒 PRIORITY ORDER FOR AVAILABILITY:
 * 1. VACACIONES/LICENCIA → NOT available (blocks everything)
 * 2. Base assignment
 * 3. Swaps
 */

/**
 * Precalculates which representatives are blocked by vacation/license on a given date.
 * Returns a Set of representative IDs that are NOT available for coverage.
 */
function buildBlockedRepresentativesSet(
    incidents: Incident[],
    date: ISODate,
    allCalendarDays: DayInfo[],
    representatives: Representative[]
): Set<string> {
    const blocked = new Set<string>()

    for (const incident of incidents) {
        // Only blocking incidents
        if (!['VACACIONES', 'LICENCIA'].includes(incident.type)) continue

        const rep = representatives.find(r => r.id === incident.representativeId)
        if (!rep) continue

        const resolved = resolveIncidentDates(incident, allCalendarDays, rep)

        // Check if date is within the blocking period
        // Use returnDate for comprehensive blocking (start to day before return)
        if (resolved.start && resolved.returnDate) {
            if (date >= resolved.start && date < resolved.returnDate) {
                blocked.add(incident.representativeId)
            }
        }
    }

    return blocked
}

/**
 * Calculates the effective coverage for a day, considering:
 * 1. Blocking incidents (VACACIONES/LICENCIA) - PRIORITY 1
 * 2. Base assignments (from WeeklyPlan)
 * 3. Swaps
 */
export function getEffectiveDailyCoverage(
    weeklyPlan: WeeklyPlan,
    swaps: SwapEvent[],
    coverageRules: CoverageRule[],
    date: ISODate,
    incidents: Incident[],
    allCalendarDays: DayInfo[],
    representatives: Representative[]
): DailyCoverageMap {
    // 🔒 STEP 0: Precalculate blocked representatives (VACACIONES/LICENCIA)
    const blockedReps = buildBlockedRepresentativesSet(
        incidents,
        date,
        allCalendarDays,
        representatives
    )

    // 1. Calculate Base Coverage from WeeklyPlan (Pre-Swap)
    // EXCLUDE representatives who are blocked by vacation/license
    const baseCounts = {
        DAY: { actual: 0 },
        NIGHT: { actual: 0 }
    }

    for (const agent of weeklyPlan.agents) {
        // 🚫 Skip if blocked by vacation/license
        if (blockedReps.has(agent.representativeId)) {
            continue
        }

        const dayInfo = agent.days[date]
        if (dayInfo?.assignment) {
            if (dayInfo.assignment.type === 'SINGLE') {
                baseCounts[dayInfo.assignment.shift].actual++
            } else if (dayInfo.assignment.type === 'BOTH') {
                baseCounts.DAY.actual++
                baseCounts.NIGHT.actual++
            }
        }
    }

    // 2. Apply Swaps
    // Convert baseCounts to DailyShiftCoverage structure
    const baseCoverage = {
        date,
        shifts: {
            DAY: baseCounts.DAY.actual,
            NIGHT: baseCounts.NIGHT.actual
        }
    }
    const swapAdjustedCoverage = applySwapsToCoverage(baseCoverage, swaps)

    // 3. Resolve Requirements (Rules)
    const dayReq = resolveCoverage(date, 'DAY', coverageRules)
    const nightReq = resolveCoverage(date, 'NIGHT', coverageRules)

    // 4. Assemble Result
    return {
        DAY: {
            actual: swapAdjustedCoverage.shifts.DAY,
            required: dayReq.required,
            status: getStatus(swapAdjustedCoverage.shifts.DAY, dayReq.required),
            reason: dayReq.reason
        },
        NIGHT: {
            actual: swapAdjustedCoverage.shifts.NIGHT,
            required: nightReq.required,
            status: getStatus(swapAdjustedCoverage.shifts.NIGHT, nightReq.required),
            reason: nightReq.reason
        }
    }
}

function getStatus(actual: number, required: number): CoverageStatus {
    if (actual < required) return 'DEFICIT'
    if (actual > required) return 'SURPLUS'
    return 'OK'
}
