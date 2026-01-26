/**
 * 🔄 COVERAGE MODEL
 * 
 * Represents operational coverage relationships between representatives.
 * 
 * CRITICAL RULES:
 * - Coverage is NOT a plan change (doesn't modify assignment)
 * - Coverage is NOT a reality change (doesn't modify status)
 * - Coverage is a RELATIONAL event that projects to badges
 * - Coverage NEVER moves people between shifts in the planner
 * 
 * This prevents breaking:
 * - Planner core logic
 * - MIXTO handling
 * - Weekly aggregation
 * - Incentive calculations
 * - Audit trail
 */

import { ISODate, RepresentativeId } from '../types'
import { ShiftType } from '../calendar/types'

/**
 * 🟢 COVERAGE ENTITY
 * 
 * A coverage is a relationship where one representative covers another's shift.
 */
export interface Coverage {
    /** Unique identifier */
    id: string

    /** Date of coverage */
    date: ISODate

    /** Which shift is being covered */
    shift: ShiftType

    /** Representative being covered (appears with "CUBIERTO" badge) */
    coveredRepId: RepresentativeId

    /** Representative doing the covering (appears with "CUBRIENDO" badge) */
    coveringRepId: RepresentativeId

    /** Optional note explaining the coverage */
    note?: string

    /** When this coverage was created */
    createdAt: string

    /** Status of the coverage */
    status: 'ACTIVE' | 'CANCELLED'
}

/**
 * 🔍 COVERAGE LOOKUP RESULT
 * 
 * What we need to know about coverage for a specific rep/day.
 */
export interface CoverageLookup {
    /** Is this person being covered by someone else? */
    isCovered: boolean

    /** Is this person covering someone else? */
    isCovering: boolean

    /** If covered, who is covering them? */
    coveredBy?: {
        repId: RepresentativeId
        shift: ShiftType
        coverageId: string
    }

    /** If covering, who are they covering? */
    covering?: {
        repId: RepresentativeId
        shift: ShiftType
        coverageId: string
    }
}

/**
 * 🔎 FIND COVERAGE FOR DAY
 * 
 * Pure function to determine coverage status for a representative on a specific day.
 * 
 * @param repId - Representative to check
 * @param date - Date to check
 * @param allCoverages - All active coverages in the system
 * @param shift - Optional shift filter (if not provided, returns coverage for any shift)
 * @returns Coverage lookup result
 */
export function findCoverageForDay(
    repId: RepresentativeId,
    date: ISODate,
    allCoverages: Coverage[],
    shift?: ShiftType // ✅ NEW: Optional shift filter
): CoverageLookup {
    const activeCoverages = allCoverages.filter(
        c => c.status === 'ACTIVE' && c.date === date && (!shift || c.shift === shift) // ✅ Filter by shift if provided
    )

    const coveredBy = activeCoverages.find(c => c.coveredRepId === repId)
    const covering = activeCoverages.find(c => c.coveringRepId === repId)

    return {
        isCovered: !!coveredBy,
        isCovering: !!covering,
        coveredBy: coveredBy ? {
            repId: coveredBy.coveringRepId,
            shift: coveredBy.shift,
            coverageId: coveredBy.id
        } : undefined,
        covering: covering ? {
            repId: covering.coveredRepId,
            shift: covering.shift,
            coverageId: covering.id
        } : undefined
    }
}
