/**
 * 🎯 RESOLVE SLOT RESPONSIBILITY
 * 
 * Core resolver that determines who is actually responsible for a slot.
 * 
 * CRITICAL RULES:
 * - If active coverage exists → Covering Rep is responsible (Source of Truth)
 * - If no coverage but badge is CUBIERTO → UNASSIGNED (Coverage Failed)
 * - Otherwise → Clicked Rep is responsible (BASE)
 * 
 * This function NEVER invents a responsible person.
 */

import type { ISODate, ShiftType } from '../calendar/types'
import type { RepresentativeId } from '../representatives/types'
import type { WeeklyPlan, Representative } from '../types'
import type { Coverage } from './coverage'
import type { ResponsibilityResolution } from './slotResponsibility'

export function resolveSlotResponsibility(
    clickedRepId: RepresentativeId,
    date: ISODate,
    shift: ShiftType,
    weeklyPlan: WeeklyPlan,
    coverages: Coverage[],
    representatives: Representative[]
): ResponsibilityResolution {
    // Find the agent plan for the clicked rep
    const agentPlan = weeklyPlan.agents.find(a => a.representativeId === clickedRepId)
    const dayData = agentPlan?.days[date]

    // CRITICAL: If no plan data exists, slot is invalid
    if (!agentPlan || !dayData) {
        return {
            kind: 'UNASSIGNED',
            slotOwnerId: clickedRepId,
            reason: 'NO_RESPONSIBLE',
            displayContext: {
                title: 'Slot inválido',
                subtitle: 'No existe información de planificación para este día'
            }
        }
    }

    const clickedRep = representatives.find(r => r.id === clickedRepId)
    const ownerName = clickedRep?.name ?? 'Desconocido'

    // RULE 1: Active Coverage acts as primary source of truth
    const coverage = coverages.find(
        c => c.status === 'ACTIVE' &&
            c.date === date &&
            c.shift === shift &&
            c.coveredRepId === clickedRepId
    )

    if (coverage) {
        const coveringRep = representatives.find(r => r.id === coverage.coveringRepId)

        if (!coveringRep) {
            // Coverage exists but covering rep doesn't exist → UNASSIGNED
            return {
                kind: 'UNASSIGNED',
                slotOwnerId: clickedRepId,
                reason: 'COVERAGE_FAILED',
                displayContext: {
                    title: 'Slot descubierto',
                    subtitle: `La cobertura estaba asignada a un representante que ya no existe`
                }
            }
        }

        // Valid coverage - covering rep is responsible
        return {
            kind: 'RESOLVED',
            targetRepId: coverage.coveringRepId,
            slotOwnerId: clickedRepId,
            source: 'COVERAGE',
            displayContext: {
                title: 'Ausencia por cobertura fallida',
                subtitle: `Este turno estaba cubierto por ${coveringRep.name}`,
                targetName: coveringRep.name,
                ownerName
            }
        }
    }

    const badge = dayData.badge

    // RULE 2: CUBIERTO badge but no coverage record
    if (badge === 'CUBIERTO') {
        return {
            kind: 'UNASSIGNED',
            slotOwnerId: clickedRepId,
            reason: 'COVERAGE_FAILED',
            displayContext: {
                title: 'Slot descubierto',
                subtitle: `Este turno tenía cobertura pero no se encontró registro activo`
            }
        }
    }

    // RULE 3: Base responsibility
    return {
        kind: 'RESOLVED',
        targetRepId: clickedRepId,
        slotOwnerId: clickedRepId,
        source: 'BASE',
        displayContext: {
            title: 'Ausencia estándar',
            subtitle: `Registrando ausencia para ${ownerName}`,
            targetName: ownerName,
            ownerName
        }
    }
}
