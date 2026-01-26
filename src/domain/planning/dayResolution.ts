/**
 * 🧠 CANONICAL DAY RESOLUTION TYPES
 * 
 * Separates three orthogonal concerns:
 * 1. PLAN: What should happen (organizational intent)
 * 2. REALITY: What actually happened (human events)
 * 3. COMPUTED: What to display/calculate (derived views)
 * 
 * This eliminates semantic ambiguity where a single object tries to represent
 * "working but absent" or "covered by someone else".
 */

import { ShiftAssignment } from './shiftAssignment'
import { IncidentType } from '../incidents/types'

/**
 * 🟢 LAYER 1: PLAN
 * Represents the organizational intent for this day.
 * Never mentions absences, vacations, or human reality.
 */
export interface DayPlan {
    /** What shift/assignment was planned */
    assignment: ShiftAssignment

    /** Where this plan came from (for audit) */
    source: 'BASE' | 'OVERRIDE' | 'SWAP' | 'SPECIAL'
}

/**
 * 🟠 LAYER 2: REALITY
 * Represents what actually happened (human events).
 * Never decides visibility or metrics.
 */
export interface DayReality {
    /** Final operational status */
    status: 'WORKING' | 'OFF'

    /** If an incident occurred, what type */
    incidentType?: IncidentType

    /** Reference to incident for audit trail */
    incidentId?: string
}

/**
 * 🔵 LAYER 3: COMPUTED
 * Derived views for UI and metrics.
 * This is what consumers actually use.
 */
export interface DayComputed {
    /** UI presentation layer */
    display: {
        /** Should this day appear in the planner grid? */
        appearsInPlanner: boolean

        /** Which shift columns should show this person? */
        appearsInShifts: ('DAY' | 'NIGHT')[]

        /** Visual badge/indicator */
        badge?: 'AUSENCIA' | 'CUBRIENDO' | 'CUBIERTO' | 'VACACIONES' | 'LICENCIA'
    }

    /** Metrics/business logic layer */
    metrics: {
        /** Counts as a worked day for attendance? */
        countsAsWorked: boolean

        /** Counts for incentive calculations? */
        countsForIncentives: boolean

        /** Counts as an absence for HR? */
        countsAsAbsence: boolean
    }
}

/**
 * 🔄 COMPLETE DAY RESOLUTION
 * The full picture of a day, with all three layers.
 */
export interface DayResolution {
    plan: DayPlan
    reality: DayReality
    computed: DayComputed
}
