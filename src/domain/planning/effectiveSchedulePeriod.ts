import { ISODate, RepresentativeId } from '../types'

/**
 * Daily duty assignment for a single day.
 * This is the atomic unit of work assignment.
 */
export type DailyDuty = 'DAY' | 'NIGHT' | 'BOTH' | 'OFF'

/**
 * Weekly pattern defining duty for each day of the week.
 * Keys are day numbers (0 = Sunday, 6 = Saturday).
 */
export interface WeeklyPattern {
    0: DailyDuty // Sunday
    1: DailyDuty // Monday
    2: DailyDuty // Tuesday
    3: DailyDuty // Wednesday
    4: DailyDuty // Thursday
    5: DailyDuty // Friday
    6: DailyDuty // Saturday
}

/**
 * Effective Schedule Period
 * 
 * CRITICAL: This entity has ABSOLUTE PRIORITY in duty resolution.
 * 
 * When an EffectiveSchedulePeriod is active for a representative on a given date:
 * - It REPLACES the base shift + mixProfile completely
 * - It IGNORES all SpecialSchedules
 * - It is the SOLE source of truth for that period
 * 
 * Use cases:
 * - Temporary contract changes (e.g., student starting university)
 * - Mixed shift redefinition (e.g., changing which days are mixed)
 * - Complex schedule adjustments that need atomic control
 * 
 * DO NOT use for:
 * - Single-day exceptions (use SpecialSchedule)
 * - Vacations/licenses (use Incident)
 * - Simple overrides (use SpecialSchedule)
 */
export interface EffectiveSchedulePeriod {
    id: string
    representativeId: RepresentativeId

    /** Start date (inclusive) */
    startDate: ISODate

    /** End date (inclusive) */
    endDate: ISODate

    /** 
     * The complete weekly pattern for this period.
     * This pattern repeats for every week within the date range.
     * ALL 7 days must be defined.
     */
    weeklyPattern: WeeklyPattern

    /** Optional reason for this schedule change */
    reason?: string

    /** Optional note/comment for specific details */
    note?: string

    /** Timestamp when this period was created */
    createdAt: ISODate
}
