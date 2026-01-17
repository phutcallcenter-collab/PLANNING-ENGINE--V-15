import { EffectiveSchedulePeriod, DailyDuty } from './effectiveSchedulePeriod'
import { ISODate, RepresentativeId } from '../types'

/**
 * Finds the active EffectiveSchedulePeriod for a representative on a given date.
 * 
 * CRITICAL: Only ONE period can be active at a time for a given representative.
 * If multiple periods overlap, this is a data integrity error that should be prevented
 * at the UI/validation layer.
 * 
 * @param periods - All effective periods in the system
 * @param representativeId - The representative to check
 * @param date - The date to check (ISO format)
 * @returns The active period, or null if none applies
 */
export function findActiveEffectivePeriod(
    periods: EffectiveSchedulePeriod[],
    representativeId: RepresentativeId,
    date: ISODate
): EffectiveSchedulePeriod | null {
    const activePeriods = periods.filter(
        period =>
            period.representativeId === representativeId &&
            date >= period.startDate &&
            date <= period.endDate // endDate is inclusive
    )

    if (activePeriods.length === 0) {
        return null
    }

    if (activePeriods.length > 1) {
        // This should NEVER happen if validation is working correctly
        console.error(
            `[CRITICAL] Multiple overlapping EffectiveSchedulePeriods found for rep ${representativeId} on ${date}`,
            activePeriods
        )
        // Return the most recently created one as fallback
        return activePeriods.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    }

    return activePeriods[0]
}

/**
 * Gets the daily duty for a specific date from an EffectiveSchedulePeriod.
 * 
 * @param period - The effective period
 * @param date - The date to get duty for
 * @returns The duty assignment for that day
 */
export function getDutyFromPeriod(
    period: EffectiveSchedulePeriod,
    date: ISODate
): DailyDuty {
    const dayOfWeek = new Date(date + 'T12:00:00Z').getDay() // 0 = Sunday
    return period.weeklyPattern[dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6]
}

/**
 * Validates that there are no overlapping periods for the same representative.
 * 
 * @param periods - All periods to check
 * @param newPeriod - The new period to validate (without id if creating)
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @returns Error message if invalid, null if valid
 */
export function validateNoOverlap(
    periods: EffectiveSchedulePeriod[],
    newPeriod: Omit<EffectiveSchedulePeriod, 'id' | 'createdAt'>,
    excludeId?: string
): string | null {
    const conflicts = periods.filter(existing => {
        // Skip the period being updated
        if (excludeId && existing.id === excludeId) {
            return false
        }

        // Only check same representative
        if (existing.representativeId !== newPeriod.representativeId) {
            return false
        }

        // Check for date overlap
        // Periods overlap if: start1 <= end2 AND start2 <= end1
        const overlaps =
            newPeriod.startDate <= existing.endDate &&
            existing.startDate <= newPeriod.endDate

        return overlaps
    })

    if (conflicts.length > 0) {
        const conflictDates = conflicts
            .map(c => `${c.startDate} to ${c.endDate}`)
            .join(', ')
        return `Este período se solapa con períodos existentes: ${conflictDates}`
    }

    return null
}
