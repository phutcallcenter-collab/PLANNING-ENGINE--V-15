'use client'

import type { ISODate } from '../calendar/types'
import type { RepresentativeId } from '../representatives/types'
import type { ShiftAssignment } from '../planning/shiftAssignment'

export type { ISODate }

/**
 * Represents the final status of an agent on a given day.
 * - WORKING: Present and available.
 * - OFF: Absent, either planned or unplanned.
 */
export type DailyStatus = 'WORKING' | 'OFF'

/**
 * Represents the semantic reason for an absence or presence, or a recorded event.
 * This unified type covers all events in the system.
 * It includes punitive incidents, planned absences, and internal scheduling adjustments.
 */
export type IncidentType =
  // Punctual, punitive incidents
  | 'TARDANZA'
  | 'AUSENCIA'
  | 'ERROR'
  | 'OTRO'
  // Planned, multi-day absences
  | 'LICENCIA' // (counts calendar days)
  | 'VACACIONES' // (counts working days)
  // Internal scheduling adjustments
  | 'OVERRIDE' // Not for user logging
  | 'SWAP'     // Peer-to-peer exchange

/**
 * The unified interface for all recorded events, both scheduling and punitive.
 * This is the RAW data object. `points` are calculated by the analytics layer, not stored here.
 */
export interface Incident {
  id: string
  representativeId: RepresentativeId
  type: IncidentType
  startDate: ISODate
  duration: number // Duration is 1 for all punctual incidents
  note?: string
  createdAt: string
  // For 'OTRO' type, a custom point value can be specified.
  customPoints?: number
  // For 'OVERRIDE', a specific assignment can be forced
  assignment?: ShiftAssignment
  // For 'OVERRIDE', this captures the state before the change for a perfect undo
  // For 'OVERRIDE', this captures the state before the change for a perfect undo
  previousAssignment?: ShiftAssignment
  // Additional details (e.g., 'JUSTIFICADA' for absences)
  details?: string

  /**
   * 🎯 SLOT RESPONSIBILITY TRACKING
   * 
   * These fields track the responsibility chain for absences.
   * 
   * source: How this incident was assigned
   *   - 'BASE': Normal assignment (clicked rep is responsible)
   *   - 'COVERAGE': Assigned due to coverage failure
   *   - 'SWAP': Assigned due to swap
   * 
   * slotOwnerId: The original owner of the slot (when source !== 'BASE')
   *   - Present when an absence is assigned to someone other than the slot owner
   *   - Example: Emely fails to cover Luz → slotOwnerId = Luz, representativeId = Emely
   */
  source?: 'BASE' | 'COVERAGE' | 'SWAP' | 'OVERRIDE'
  slotOwnerId?: RepresentativeId

  // Metadata for advanced ops (e.g. swap target)
  metadata?: Record<string, any>

  /**
   * 🆔 DISCIPLINARY IDENTITY
   * Unique key identifying the specific disciplinary slot.
   * Format: "BASE" or "COVERAGE:SlotOwnerId"
   * Used to distinguish multiple absences on the same day.
   */
  disciplinaryKey?: string
}

/**
 * Data Transfer Object for creating a new incident from the UI.
 * This simplifies form handling before the full Incident object is created.
 */
export interface IncidentInput {
  representativeId: RepresentativeId
  type: IncidentType
  startDate: ISODate
  duration: number
  customPoints?: number // For 'OTRO' type, this is set manually
  note?: string
  assignment?: ShiftAssignment
  previousAssignment?: ShiftAssignment
  details?: string
  source?: 'BASE' | 'COVERAGE' | 'SWAP' | 'OVERRIDE'
  slotOwnerId?: RepresentativeId
}
