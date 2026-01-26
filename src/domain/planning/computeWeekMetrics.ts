/**
 * 🧮 WEEKLY AGGREGATION LAYER
 * 
 * Computes weekly-level metrics from daily resolutions.
 * 
 * CRITICAL RULES:
 * - NEVER reads plan or reality directly
 * - ONLY consumes DayResolution.computed.metrics
 * - NEVER interprets incidents
 * - NEVER duplicates days (MIXTO = 1 day, not 2)
 * 
 * This is the ONLY place where weekly business rules live.
 */

import { DayResolution } from './dayResolution'

/**
 * 🟢 WEEKLY COMPUTED METRICS
 * 
 * Canonical weekly truth derived from daily metrics.
 */
export interface WeekComputed {
    /** Attendance tracking */
    attendance: {
        /** Days that should have been worked (excludes vacations) */
        plannedDays: number

        /** Days counted as worked (includes swaps, excludes absences) */
        workedDays: number

        /** Days marked as absent */
        absentDays: number
    }

    /** Incentive eligibility and tracking */
    incentives: {
        /** Final eligibility decision */
        eligible: boolean

        /** Days that count toward incentives */
        workedDays: number

        /** Days spent covering others (positive contribution) */
        coveredDays: number

        /** Whether disqualified by absence */
        disqualifiedByAbsence: boolean
    }

    /** Coverage tracking */
    coverage: {
        /** Days spent covering others */
        coveringDays: number

        /** Days where this person was covered (future) */
        coveredDays: number
    }
}

/**
 * 🧮 COMPUTE WEEK METRICS
 * 
 * Pure function that aggregates daily metrics into weekly truth.
 * 
 * RULES:
 * 1. PlannedDays = days where countsAsWorked would be true (before absence)
 * 2. AUSENCIA: One absence disqualifies incentives entirely
 * 3. SWAP: Counts positively for coverage and incentives
 * 4. MIXTO: Never duplicates (1 day = 1 day)
 * 5. VACATION: Reduces denominator, doesn't penalize
 * 
 * @param days - All DayResolutions for this representative this week
 * @returns Aggregated weekly metrics
 */
export function computeWeekMetrics(days: DayResolution[]): WeekComputed {
    // Initialize counters
    let plannedDays = 0
    let workedDays = 0
    let absentDays = 0
    let incentiveWorkedDays = 0
    let coveringDays = 0
    let hasAbsence = false

    // Aggregate from daily metrics (NEVER from plan/reality)
    for (const day of days) {
        const metrics = day.computed.metrics

        // Attendance
        if (metrics.countsAsWorked) {
            plannedDays++

            if (!metrics.countsAsAbsence) {
                workedDays++
            }
        }

        if (metrics.countsAsAbsence) {
            absentDays++
            hasAbsence = true
        }

        // Incentives
        if (metrics.countsForIncentives) {
            incentiveWorkedDays++
        }

        // Coverage (check display badge for CUBRIENDO)
        if (day.computed.display.badge === 'CUBRIENDO') {
            coveringDays++
        }
    }

    // Weekly incentive eligibility rule
    const eligible = !hasAbsence && incentiveWorkedDays > 0

    return {
        attendance: {
            plannedDays,
            workedDays,
            absentDays
        },
        incentives: {
            eligible,
            workedDays: incentiveWorkedDays,
            coveredDays: coveringDays, // Covering counts as positive contribution
            disqualifiedByAbsence: hasAbsence
        },
        coverage: {
            coveringDays,
            coveredDays: 0 // Future: track when this person is covered by others
        }
    }
}
