import { AuditEvent } from '@/domain/audit/types'

export function filterAuditByRepresentative(
    events: AuditEvent[],
    repId: string | null
): AuditEvent[] {
    if (!repId) return events

    return events.filter(e => {
        // 🛡️ Guard: Check explicit top-level repId first (if added to type)
        if (e.repId === repId) return true

        // 🛡️ Guard: Inspect payload safely
        const p = e.payload as any // We cast to check props, but assume nothing exists
        if (!p || typeof p !== 'object') return false

        // Canonical fields where a Rep ID might appear
        return (
            p.representativeId === repId ||
            p.coveredRepId === repId ||
            p.coveringRepId === repId ||
            p.repId === repId
        )
    })
}
