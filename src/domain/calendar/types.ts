// ISO date string in YYYY-MM-DD format
export type ISODate = string

export type ShiftType = 'DAY' | 'NIGHT'

export type DayKind =
  | 'WORKING'
  // | 'NON_WORKING' // Represents weekends by default. This concept is removed.
  | 'HOLIDAY' // A special working day

export interface DayInfo {
  date: ISODate
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  kind: DayKind
  label?: string
  isSpecial: boolean
}

/**
 * Represents a "special day" override in the calendar.
 * This is persisted as part of the CalendarState.
 */
export interface SpecialDay {
  date: ISODate
  // Kind can only be customized to WORKING or HOLIDAY
  kind: 'WORKING' | 'HOLIDAY'
  label?: string
}

/**
 * The state object for the calendar, containing all customizations.
 */
export interface CalendarState {
  specialDays: SpecialDay[]
}
