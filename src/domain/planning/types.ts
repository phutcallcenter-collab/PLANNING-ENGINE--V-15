import { ISODate } from '../calendar/types'
import { RepresentativeId } from '../representatives/types'
import { DailyStatus, IncidentType } from '../incidents/types'
import { ShiftAssignment } from './shiftAssignment'

/**
 * Represents the detailed status of an agent for a single day,
 * including the source of truth for that status.
 */
export interface DailyPresence {
  status: DailyStatus
  source: 'BASE' | 'OVERRIDE' | 'INCIDENT' | 'SWAP'
  type?: IncidentType | 'MIXTO' | 'DAY' | 'NIGHT' | 'OFF'
  assignment?: ShiftAssignment
  badge?: 'CUBIERTO' | 'CUBRIENDO' | 'AUSENCIA' | 'VACACIONES' | 'LICENCIA' // 🔄 Coverage badge
  coverageContext?: { // 🔄 NEW: Coverage context for tooltips
    coveredByRepId?: RepresentativeId
    coveringRepId?: RepresentativeId
  }
}

/**
 * Represents the status of a single representative for a whole week,
 * mapping each date to their detailed presence on that day.
 */
export interface WeeklyPresence {
  representativeId: RepresentativeId
  days: Record<ISODate, DailyPresence>
}

/**
 * The central data structure for a weekly plan.
 * It contains the schedules for all representatives for a given week.
 */
export interface WeeklyPlan {
  weekStart: ISODate
  agents: WeeklyPresence[]
}
