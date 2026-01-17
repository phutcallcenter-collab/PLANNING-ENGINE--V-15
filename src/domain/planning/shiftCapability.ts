/**
 * ⚠️ HARDENED DOMAIN MODULE
 *
 * This file contains the pure, deterministic logic for determining the
 * shift capabilities of a representative on a given day. It is the single
 * source of truth for answering: "What shifts can this person cover today?"
 *
 * It must remain free of state, UI, or any external dependencies.
 */
import { getDay } from 'date-fns'
import type { Representative } from '../representatives/types'
import type { ISODate, ShiftType } from '../calendar/types'

/**
 * Determines the shift(s) a representative is capable of covering on a specific date,
 * based on their base shift and their mix profile, if any.
 * This does NOT determine the final assignment, only the potential capabilities.
 *
 * @param representative The representative in question.
 * @param date The ISO date string for the day to check.
 * @returns An array of `ShiftType`s the representative can cover. Returns an empty array if they are not scheduled to work.
 */
export function getShiftCapabilities(
  representative: Representative,
  date: ISODate
): ShiftType[] {
  try {
    const dayOfWeek = getDay(new Date(date + 'T12:00:00Z')) // Use a fixed time to avoid TZ issues

    // Validate that we got a valid day of week (0-6)
    if (isNaN(dayOfWeek)) {
      console.error(`[getShiftCapabilities] Invalid date provided: ${date}`)
      return []
    }

    // Rule 1: Check if base schedule explicitly says OFF
    // If baseSchedule is empty or doesn't have an entry for this day, assume WORKING (fallback)
    const baseScheduleEntry = representative.baseSchedule?.[dayOfWeek]
    const isWorkingBaseDay = baseScheduleEntry !== 'OFF'

    if (!isWorkingBaseDay) {
      return []
    }

    // Rule 2: If there's no mix profile, they can only work their base shift.
    const { baseShift, mixProfile } = representative
    if (!mixProfile) {
      return [baseShift]
    }

    // Rule 3: Determine if the day matches the representative's mix profile.
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4 // Mon-Thu
    const isWeekend = dayOfWeek === 0 || dayOfWeek >= 5 // Fri-Sun

    if (
      (mixProfile.type === 'WEEKDAY' && isWeekday) ||
      (mixProfile.type === 'WEEKEND' && isWeekend)
    ) {
      return ['DAY', 'NIGHT'] // Can cover both shifts
    }

    // Rule 4: If the day doesn't match the mix profile, they fall back to their base shift.
    return [baseShift]
  } catch (e) {
    // In case of an invalid date, fall back to the safest option.
    console.error(`[getShiftCapabilities] Invalid date provided: ${date}`)
    return []
  }
}
