import { DailyStatus } from '../incidents/types'
import { ShiftType } from '../calendar/types'

export type RepresentativeId = string

/**
 * Represents the base schedule for a representative.
 * The key is the day of the week (0=Sun, 1=Mon, ..., 6=Sat).
 * The value is their default status for that day.
 */
export type BaseSchedule = Record<number, DailyStatus>

/**
 * Defines the profile for a representative who can work both shifts
 * on specific days of the week. This is a capability, not a separate shift type.
 */
export type MixProfile =
  | { type: 'WEEKDAY' } // Monday to Thursday
  | { type: 'WEEKEND' } // Friday to Sunday

/**
 * Defines the operational role of a representative.
 */
export type RepresentativeRole = 'SALES' | 'CUSTOMER_SERVICE' | 'SUPERVISOR' | 'MANAGER'

export interface Representative {
  id: RepresentativeId
  name: string
  baseSchedule: BaseSchedule
  baseShift: ShiftType
  role: RepresentativeRole
  mixProfile?: MixProfile
  isActive: boolean
  orderIndex: number  // Orden canónico dentro del turno (alimenta UI y reportes)
}
