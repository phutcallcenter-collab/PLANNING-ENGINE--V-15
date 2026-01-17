/**
 * Wizard state types for Special Schedule creation.
 * This is human language intermediate state, not domain state.
 */

import { ISODate, ShiftType } from '@/domain/types'

export type ScheduleIntent =
    | 'WORK_SINGLE_SHIFT'
    | 'WORK_BOTH_SHIFTS'
    | 'OFF'

export interface WizardState {
    /** User's intent: what will happen on those days */
    intent: ScheduleIntent | null

    /** Specific shift (only if intent = WORK_SINGLE_SHIFT) */
    shift?: ShiftType

    /** Days of week affected (0-6, Sunday-Saturday) */
    days: number[]

    /** Start date of the adjustment */
    startDate?: ISODate

    /** End date of the adjustment */
    endDate?: ISODate

    /** Optional reason/note */
    note?: string

    /** Whether to replace base mixed days (only for WORK_BOTH_SHIFTS when base is already mixed) */
    replaceBaseMixedDays?: boolean
}
