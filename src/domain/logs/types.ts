import { ISODate, RepresentativeId } from '../types'

/**
 * Represents a historical log entry for a specific event that occurred.
 * This is for auditing and tracking what actually happened, vs what was planned.
 */

export type LogType =
  | 'LATE' // Llegó tarde
  | 'ABSENT' // No se presentó (sin justificación previa)
  | 'LEFT_EARLY' // Se fue antes de tiempo
  | 'NO_SHOW' // Ausencia total no justificada
  | 'MANUAL_NOTE' // Una nota manual del supervisor

export interface DailyLog {
  id: string
  representativeId: RepresentativeId
  date: ISODate
  type: LogType
  note?: string
  createdAt: string // ISO 8601 Timestamp
}
