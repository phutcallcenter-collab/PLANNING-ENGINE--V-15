import React from 'react'
import { AuditTimelineItem } from '@/application/audit/getAuditTimeline'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function AuditTimeline({ items }: { items: AuditTimelineItem[] }) {
    if (items.length === 0) {
        return <p style={{ color: '#6b7280' }}>No hay eventos registrados.</p>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(e => (
                <div
                    key={e.id}
                    style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        background: '#f9fafb'
                    }}
                >
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {format(parseISO(e.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>

                    <div style={{ fontWeight: 600 }}>{e.summary}</div>

                    <div style={{ fontSize: '12px', color: '#374151' }}>
                        Actor: {e.actor}
                    </div>
                </div>
            ))}
        </div>
    )
}
