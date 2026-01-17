// src/ui/stats/audit/AuditTable.tsx
'use client'

import { AuditEvent } from '@/domain/audit/types'
import { AuditRow } from './AuditRow'

interface Props {
  events: AuditEvent[]
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  borderBottom: '1px solid #e5e7eb',
}

export function AuditTable({ events }: Props) {
  if (events.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#6b7280',
          fontStyle: 'italic',
          background: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        No hay eventos de auditoría registrados.
      </div>
    )
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f9fafb' }}>
          <tr>
            <th style={tableHeaderStyle}>Fecha</th>
            <th style={tableHeaderStyle}>Actor</th>
            <th style={tableHeaderStyle}>Acción</th>
            <th style={tableHeaderStyle}>Entidad</th>
            <th style={tableHeaderStyle}>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => (
            <AuditRow key={event.id} event={event} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
