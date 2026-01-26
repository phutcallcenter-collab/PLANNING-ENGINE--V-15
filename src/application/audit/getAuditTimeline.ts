import { AuditEvent } from '@/domain/audit/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export interface AuditTimelineItem {
    id: string
    timestamp: string
    type: AuditEvent['type']
    summary: string
    actor: string
    details?: string
}

// Helper to safely extract string properties from unknown payload
function safeString(obj: unknown, key: string): string | undefined {
    if (typeof obj === 'object' && obj !== null && key in obj) {
        const val = (obj as any)[key]
        return typeof val === 'string' ? val : undefined
    }
    return undefined
}

export function mapAuditEventsToTimeline(
    events: AuditEvent[]
): AuditTimelineItem[] {
    return events
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .map(e => {
            // 🛡️ Fail-safe: Always return a valid item, even if payload is weird
            const payload = e.payload

            let summary = formatEventType(e.type)
            let details: string | undefined

            // Enrich summary based on known payload structures
            // 🧠 NOTE: WE NEVER TRUST PAYLOAD 100%
            if (e.type === 'COVERAGE_CREATED') {
                const date = safeString(payload, 'date')
                if (date) summary += ` para el ${date}`
            }

            if (e.type === 'INCIDENT_CREATED') {
                const type = safeString(payload, 'incidentType')
                if (type) summary = `Incidencia: ${type}`
                const note = safeString(payload, 'note')
                if (note) details = note
            }

            if (e.type === 'SNAPSHOT_CREATED') {
                summary = 'Snapshot Semanal Creado'
            }

            return {
                id: e.id,
                timestamp: e.timestamp,
                type: e.type,
                actor: e.actor,
                summary,
                details
            }
        })
}

function formatEventType(type: AuditEvent['type']): string {
    switch (type) {
        case 'COVERAGE_CREATED': return 'Cobertura creada'
        case 'COVERAGE_CANCELLED': return 'Cobertura cancelada'
        case 'INCIDENT_CREATED': return 'Incidencia registrada'
        case 'INCIDENT_REMOVED': return 'Incidencia eliminada'
        case 'SWAP_APPLIED': return 'Intercambio aplicado'
        case 'OVERRIDE_APPLIED': return 'Modificación manual'
        case 'SNAPSHOT_CREATED': return 'Snapshot creado'
        default: return type
    }
}
