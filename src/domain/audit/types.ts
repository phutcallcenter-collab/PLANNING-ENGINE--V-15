// src/domain/audit/types.ts

import { ISODate, ShiftType } from '../calendar/types'
import { RepresentativeId } from '../representatives/types'

/**
 * Defines the system entity that was the target of an audited action.
 */
export type AuditEntity =
  | 'INCIDENT'
  | 'PLANNING' // e.g., an override
  | 'COVERAGE_RULE'
  | 'CALENDAR'
  | 'SYSTEM' // e.g., data reset
  | 'REPRESENTATIVE'

/**
 * Defines the specific type of action that was performed and audited.
 * This is a closed set of actions to ensure consistency.
 */
export type AuditActionType =
  // INCIDENT actions
  | 'INCIDENT_CREATED'
  | 'INCIDENT_DELETED'
  | 'INCIDENT_UPDATED' // For future use
  // PLANNING actions
  | 'OVERRIDE_APPLIED'
  | 'OVERRIDE_REVERTED'
  // COVERAGE_RULE actions
  | 'COVERAGE_RULE_CREATED'
  | 'COVERAGE_RULE_UPDATED'
  | 'COVERAGE_RULE_DELETED'
  // CALENDAR actions
  | 'SPECIAL_DAY_SET'
  | 'SPECIAL_DAY_CLEARED'
  // SYSTEM actions
  | 'APP_STATE_RESET'
  | 'DATA_IMPORTED' // For future use
  | 'DATA_EXPORTED' // For future use

/**
 * The immutable, forensic log entry for any critical action in the system.
 * This structure is designed to be self-contained and provide a complete
 * picture of what happened.
 */
export interface AuditEvent {
  id: string
  timestamp: string // ISO 8601 string for the exact moment of the event

  // Who performed the action?
  actor: {
    id: string // Could be a user ID, or 'system'
    name: string // e.g., 'Admin User', 'System Process'
    role?: string
  }

  // What was the action?
  action: AuditActionType

  // What was affected?
  target: {
    entity: AuditEntity
    entityId?: string // e.g., the incident ID, the rule ID
    label?: string // e.g., the representative's name, the rule's label
  }

  // If the action was a mutation, what changed?
  change?: {
    field: string // e.g., 'status', 'required_coverage'
    from: any
    to: any
  }

  // Additional context to understand the event's scope
  context?: {
    date?: ISODate
    representativeId?: RepresentativeId
    shift?: ShiftType
    reason?: string // e.g., 'Cleared due to new AUSENCIA'
  }
}

/**
 * Input for creating a new audit event via the `recordAuditEvent` function.
 * This separates the raw input from the final, normalized AuditEvent object.
 */
export interface AuditRecordInput {
  actor: {
    id: string
    name: string
    role?: string
  }

  action: AuditActionType

  target: {
    entity: AuditEntity
    entityId?: string
    label?: string
  }

  change?: {
    field: string
    from: unknown
    to: unknown
  }

  context?: {
    date?: string
    representativeId?: string
    shift?: string
    reason?: string
  }
}
