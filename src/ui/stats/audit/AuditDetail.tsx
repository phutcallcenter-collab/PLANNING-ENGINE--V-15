// src/ui/stats/audit/AuditDetail.tsx
'use client'

import { AuditEvent } from '@/domain/audit/types'
import { ArrowRight } from 'lucide-react'

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const valueStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#1f2937',
  background: '#f9fafb',
  padding: '1px 5px',
  borderRadius: '4px',
  border: '1px solid #f3f4f6',
}

export function AuditDetail({ event }: { event: AuditEvent }) {
  const { change, context } = event

  if (change) {
    // Stringify objects for better display
    const fromStr = typeof change.from === 'object' && change.from !== null ? JSON.stringify(change.from) : String(change.from);
    const toStr = typeof change.to === 'object' && change.to !== null ? JSON.stringify(change.to) : String(change.to);
    
    return (
      <div style={itemStyle}>
        <span style={{ color: '#6b7280' }}>{change.field}:</span>
        <span style={{ ...valueStyle, background: '#fee2e2' }}>
          {fromStr}
        </span>
        <ArrowRight size={12} />
        <span style={{ ...valueStyle, background: '#dcfce7' }}>
          {toStr}
        </span>
      </div>
    )
  }

  if (context?.reason) {
    return (
      <span style={{ fontStyle: 'italic', color: '#4b5563' }}>
        "{context.reason}"
      </span>
    )
  }
  
  if (context?.date) {
    return `Fecha afectada: ${context.date}`
  }

  return <span>—</span>
}
