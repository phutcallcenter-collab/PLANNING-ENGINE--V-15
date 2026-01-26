import { ISODate, RepresentativeId } from '../types'

export type AuditEventType =
  | 'COVERAGE_CREATED'
  | 'COVERAGE_CANCELLED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_REMOVED'
  | 'SWAP_APPLIED'
  | 'OVERRIDE_APPLIED'
  | 'SNAPSHOT_CREATED'

export interface AuditEvent {
  id: string
  type: AuditEventType
  timestamp: string // ISODateTime
  actor: 'SYSTEM' | 'USER'
  repId?: RepresentativeId
  payload: unknown
}
