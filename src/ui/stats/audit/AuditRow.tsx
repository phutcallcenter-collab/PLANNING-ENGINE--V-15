// src/ui/stats/audit/AuditRow.tsx
'use client'

import { AuditEvent } from '@/domain/audit/types'
import { AuditActionBadge } from './AuditActionBadge'
import { AuditDetail } from './AuditDetail'

const cellStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: '13px',
  borderTop: '1px solid #f3f4f6',
  verticalAlign: 'top',
}

export function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <tr className="audit-row">
      <style jsx global>{`
        .audit-row:hover {
          background-color: #fcfcfd;
        }
      `}</style>
      <td style={{ ...cellStyle, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {new Date(event.timestamp).toLocaleString('es-ES', {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </td>
      <td style={{ ...cellStyle, fontWeight: 500 }}>
        {event.actor.name}
        {event.actor.role && (
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {event.actor.role}
          </div>
        )}
      </td>
      <td style={cellStyle}>
        <AuditActionBadge action={event.action} />
      </td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 500 }}>{event.target.entity}</div>
        {event.target.label && (
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {event.target.label}
          </div>
        )}
      </td>
      <td style={{ ...cellStyle, fontSize: 12, color: '#4b5563' }}>
        <AuditDetail event={event} />
      </td>
    </tr>
  )
}
