/**
 * 🎯 SLOT RESPONSIBILITY SYSTEM
 * 
 * Core types for slot-based responsibility resolution.
 * 
 * INVARIANTS:
 * 1. A slot has either:
 *    - exactly one responsible rep
 *    - OR an explicit UNASSIGNED state (never implicit)
 * 2. Absence is assigned to the responsible rep, not the slot owner
 * 3. UI click defines context, domain resolves responsibility
 * 4. One rep can have multiple absences in one day for different slots
 */

import type { ISODate, ShiftType } from '../calendar/types'
import type { RepresentativeId } from '../representatives/types'

/**
 * Context of a slot in the planner.
 * This is what the user clicks on, but NOT necessarily who gets the absence.
 * 
 * CRITICAL: This is CONTEXT only, not resolution.
 * Responsibility is determined by resolveSlotResponsibility(), not stored here.
 */
export interface SlotContext {
    date: ISODate
    shift: ShiftType
    ownerRepId: RepresentativeId

    badge?: 'CUBIERTO' | 'CUBRIENDO' | 'SWAP'
}

/**
 * Result of resolving who is responsible for a slot.
 * 
 * CRITICAL: This is a discriminated union.
 * A slot can be UNASSIGNED (coverage failed, no one responsible).
 * The system MUST NOT invent a responsible person.
 */
export type ResponsibilityResolution =
    | {
        kind: 'RESOLVED'
        targetRepId: RepresentativeId
        slotOwnerId: RepresentativeId
        source: 'BASE' | 'COVERAGE' | 'SWAP' | 'OVERRIDE'
        displayContext: {
            title: string
            subtitle: string
            targetName: string
            ownerName: string
        }
    }
    | {
        kind: 'UNASSIGNED'
        slotOwnerId: RepresentativeId
        reason: 'COVERAGE_FAILED' | 'NO_RESPONSIBLE'
        displayContext: {
            title: string
            subtitle: string
        }
    }
