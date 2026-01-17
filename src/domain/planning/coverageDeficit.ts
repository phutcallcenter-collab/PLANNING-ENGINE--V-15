import { ISODate, ShiftType } from '../calendar/types'

export interface ShiftDeficit {
  required: number
  actual: number
  deficit: number // 0 si cumple
}

export interface DailyCoverageDeficit {
  date: ISODate
  shifts: Record<ShiftType, ShiftDeficit>
  hasRisk: boolean
}
