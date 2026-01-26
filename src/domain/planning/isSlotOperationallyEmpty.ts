import type { ISODate, ShiftType } from '../calendar/types'
import type { Incident } from '../incidents/types'
import type { RepresentativeId } from '../representatives/types'

/**
 * 🎯 SLOT OPERATIONAL STATUS (SINGLE SOURCE OF TRUTH)
 *
 * A slot is EMPTY if:
 * - The slot owner is absent (Direct Absence)
 * - OR the covering rep failed (Coverage Absence with slotOwnerId = owner)
 *
 * This defines OPERATIONAL CAPACITY, separate from Disciplinary Responsibility.
 * Used by:
 * - getDailyShiftStats (Metrics)
 * - DailyLogView (Visualization)
 * - Reports (Forensics)
 */
export function isSlotOperationallyEmpty(
    slotOwnerId: RepresentativeId,
    date: ISODate,
    shift: ShiftType, // Shift is implicitly used by caller context (incidents in the list should be relevant to the calculation context)
    incidents: Incident[]
): boolean {
    return incidents.some(i => {
        if (i.type !== 'AUSENCIA' || i.startDate !== date) return false

        // 🧠 OPERATIONAL CORE:
        // The absence affects the slot identified by slotOwnerId.
        // If slotOwnerId is missing (standard/legacy), it affects the representativeId's slot.
        // This decouples "Who is punished" (representativeId) from "Which slot is empty" (slotOwnerId).
        const effectiveSlotOwner = i.slotOwnerId || i.representativeId

        return effectiveSlotOwner === slotOwnerId
    })
}
