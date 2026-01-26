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
  // AuditEvent now uses 'payload' instead of 'change' and 'context'
  // Payload is unknown, so we need to safely access it
  const payload = event.payload as any

  // Display payload as JSON if it exists
  if (payload && typeof payload === 'object') {
    return (
      <div style={{ fontSize: '13px', color: '#374151', fontFamily: 'monospace', background: '#f9fafb', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
        {JSON.stringify(payload, null, 2)}
      </div>
    )
  }

  return <span>—</span>
}
