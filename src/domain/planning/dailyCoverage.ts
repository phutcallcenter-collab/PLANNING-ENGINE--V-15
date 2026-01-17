import { ShiftType, ISODate } from '../calendar/types'

export interface DailyShiftCoverage {
  date: ISODate
  shifts: Record<ShiftType, number>
}
