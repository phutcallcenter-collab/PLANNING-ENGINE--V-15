import { DailyLogEntry } from './getEffectiveDailyLogData'

/**
 * Determines if an entry counts as "Present" (Working).
 */
export const isWorking = (e: DailyLogEntry) =>
    ['WORKING', 'COVERING', 'DOUBLE', 'SWAPPED_IN'].includes(e.logStatus)

/**
 * Determines if an entry counts as "Planned" (Expected to be there).
 * 
 * Logic:
 * - Numerator: Present (Working)
 * - Denominator: Planned (Expected)
 * 
 * isExpected includes:
 * 1. Working (obviously)
 * 2. Unjustified Absences (ABSENT without justification) - These create a hole we want to see (e.g. 14/15)
 * 
 * Excludes:
 * 1. Justified Absences (VACATION, LICENSE) - These reduce the planned staff (e.g. 14/14)
 * 2. OFF / SWAPPED_OUT - Not expected.
 */
export const isExpected = (e: DailyLogEntry) => {
    // If working, obviously expected
    if (isWorking(e)) return true

    // If absent...
    if (e.logStatus === 'ABSENT') {
        const justified = ['VACACIONES', 'LICENCIA', 'JUSTIFICADA']
        // If justified, does NOT count in planned (reduces denominator)
        if (e.details && justified.includes(e.details)) return false
        // If unjustified (ABSENT, TARDINESS implicit), IT COUNTS (we want to see the hole)
        return true
    }

    // OFF, SWAPPED_OUT -> Not expected in this shift
    return false
}
