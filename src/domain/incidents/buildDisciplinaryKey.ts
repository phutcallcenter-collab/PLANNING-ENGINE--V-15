import { IncidentInput, Incident } from './types'

/**
 * 🆔 BUILD DISCIPLINARY KEY
 * 
 * Generates the unique identity for a disciplinary incident.
 * This key is used to distinguish multiple incidents on the same day.
 * 
 * Rules:
 * - BASE absence -> "BASE"
 * - COVERAGE absence -> "COVERAGE:SlotOwnerId"
 * - Other types -> undefined (or generic)
 * 
 * @param i Incident or IncidentInput
 */
export function buildDisciplinaryKey(i: Pick<IncidentInput | Incident, 'type'> & Partial<Pick<Incident, 'source' | 'slotOwnerId'>>): string | undefined {
    if (i.type !== 'AUSENCIA') return undefined

    if (i.source === 'COVERAGE' && i.slotOwnerId) {
        return `COVERAGE:${i.slotOwnerId}`
    }

    return 'BASE'
}
