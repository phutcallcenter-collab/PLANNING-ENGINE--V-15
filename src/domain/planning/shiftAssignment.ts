import { ShiftType, ISODate } from '../calendar/types'

export type ShiftAssignment =
  | { type: 'NONE' }
  | { type: 'SINGLE'; shift: ShiftType }
  | { type: 'BOTH' }

export interface AssignmentContext {
  date: ISODate
  overrides?: {
    force?: ShiftAssignment
  }
  availability: 'AVAILABLE' | 'UNAVAILABLE'
}
