import { DailyLogEntry } from '../ui-adapters/getEffectiveDailyLogData'
import { isWorking, isExpected } from '../ui-adapters/dailyLogUtils'
import { ShiftType } from '@/domain/types'

export interface ShiftCountResult {
    planned: number // Denominator (Expected)
    present: number // Numerator (Working)
    absent: number  // Expected but not working (Punctual)
}

export type DailyShiftCounts = Record<ShiftType, ShiftCountResult>

/**
 * The Canonical Counting Logic.
 * Single Source of Truth for "Who is counted in the Daily Log / Chart / Counters".
 * 
 * Rules:
 * - Planned: isExpected(e) (Includes Punctual Absence, Excludes Vacation/License)
 * - Present: isWorking(e) (Only Working/Covering)
 * - Absent: Planned - Present (Punctual absences)
 */
export function getShiftCounts(entries: DailyLogEntry[]): DailyShiftCounts {
    const counts: DailyShiftCounts = {
        DAY: { planned: 0, present: 0, absent: 0 },
        NIGHT: { planned: 0, present: 0, absent: 0 }
    }

    for (const entry of entries) {
        // We trust the entry.shift from getEffectiveDailyLogData
        // However, getEffectiveDailyLogData assigns shift based on resolved duty.
        // Helper to safely assign to our result map
        const target = counts[entry.shift]
        if (!target) continue; // Should not happen if shift is DAY/NIGHT

        const expected = isExpected(entry)
        const working = isWorking(entry)

        if (expected) {
            target.planned++
        }

        if (working) {
            target.present++
        }

        // derived metric for clarity
        if (expected && !working) {
            target.absent++
        }
    }

    return counts
}
