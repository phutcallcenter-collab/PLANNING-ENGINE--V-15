'use client'
import { startOfWeek, parseISO, isBefore } from 'date-fns'
import type { ISODate } from '../calendar/types'
import { EditMode } from '@/hooks/useEditMode'

/**
 * Business rule to determine if a specific date can be edited via override.
 * The rule is: any date belonging to the current week or any future week is editable.
 * Past weeks are read-only, unless in ADMIN_OVERRIDE mode.
 * This function ONLY checks time and edit mode, not the status of the day itself.
 *
 * @param date The ISO date string to check.
 * @param anchorDate The ISO date string for the current day, used as an anchor.
 * @param editMode The current editing mode.
 * @returns True if the date is editable, false otherwise.
 */
export function canEditDay(
  date: ISODate,
  anchorDate: ISODate,
  editMode: EditMode = 'NORMAL'
): boolean {
  if (editMode === 'ADMIN_OVERRIDE') {
    return true
  }

  try {
    const currentWeekStart = startOfWeek(new Date(), {
      weekStartsOn: 1, // Monday
    })
    const targetDate = parseISO(date)

    // A date is editable if it's on or after the start of the current week.
    return !isBefore(targetDate, currentWeekStart)
  } catch (error) {
    // If date is invalid, it cannot be edited.
    console.error(`Invalid date provided to canEditDay: ${date}`, error)
    return false
  }
}
