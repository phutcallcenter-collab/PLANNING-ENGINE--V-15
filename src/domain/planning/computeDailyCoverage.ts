import { Representative } from '../representatives/types'
import { ShiftType, ISODate } from '../calendar/types'
import { getEffectiveShiftAssignment } from './effectiveShiftAssignment'
import { AssignmentContext } from './shiftAssignment'
import { DailyShiftCoverage } from './dailyCoverage'

interface CoverageInput {
  date: ISODate
  representatives: Representative[]
  contexts: Record<string, AssignmentContext>
}

/**
 * ⚠️ HARDENED COVERAGE ENGINE
 *
 * Computes REAL coverage per shift for a single date.
 * No planning logic. No UI logic. No heuristics.
 */
export function computeDailyCoverage({
  date,
  representatives,
  contexts,
}: CoverageInput): DailyShiftCoverage {
  const shifts: Record<ShiftType, number> = {
    DAY: 0,
    NIGHT: 0,
  }

  for (const rep of representatives) {
    const context = contexts[rep.id]
    if (!context) continue

    const assignment = getEffectiveShiftAssignment(rep, context)

    if (assignment.type === 'BOTH') {
      shifts.DAY++
      shifts.NIGHT++
    }

    if (assignment.type === 'SINGLE') {
      shifts[assignment.shift]++
    }
  }

  return {
    date,
    shifts,
  }
}

export type { DailyShiftCoverage } from './dailyCoverage'
