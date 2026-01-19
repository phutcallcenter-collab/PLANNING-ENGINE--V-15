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
        // Fix B2 (Counter): "El contador queda 13/14".
        // To keep the denominator (14) intact, the system must consider them "Expected".
        // We will handle the VISIBILITY (hiding them) in the UI layer.

        // Administrative absences (VACATION, LICENSE) usually reduce the denominator (14/14 -> 13/13).
        // But the user said "Juanito (justified absence)... counter 13/14".
        // This implies even justified absences (punctual) are holes.
        // VACATION/LICENSE are distinct types usually.
        // Assuming 'ABSENT' status comes from daily events (Ausencia), not long-term License.
        // If details is explicitly VACATION/LICENSE, we might still want to exclude.
        // But for "Ausencia Justificada", it MUST return TRUE.

        const longTermExclusions = ['VACACIONES', 'LICENCIA']
        if (e.details && longTermExclusions.includes(e.details)) {
            return false // Long term leaves reduce the planned workforce size
        }

        return true // Punctual absences (Justified or Not) count as Planned Workforce
    }

    // OFF, SWAPPED_OUT -> Not expected in this shift
    return false
}
