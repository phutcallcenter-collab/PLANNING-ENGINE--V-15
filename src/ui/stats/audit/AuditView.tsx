/**
 * ⚠️ AUDIT VIEW (READ-ONLY)
 * This view renders immutable audit events.
 * No filtering, grouping or derivation is allowed here.
 * Any change requires audit tests.
 */
'use client'

import React from 'react'
import { Filter, Calendar, User, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { AuditTable } from './AuditTable'

const inputStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '14px',
  background: '#f9fafb',
  color: '#6b7280',
  cursor: 'not-allowed',
  opacity: 0.7,
}

export function AuditView() {
  const auditLog = useAppStore(state => state.auditLog)

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <header
        style={{
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          Auditoría del Sistema
        </h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
          Registro forense de todas las acciones y cambios en el sistema.
        </p>
      </header>

      {/* --- Filtros (UI only placeholder) --- */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={inputStyle}>
          <Calendar size={16} />
          <span>Rango de fechas</span>
        </div>
        <div style={inputStyle}>
          <Filter size={16} />
          <span>Tipo de acción</span>
        </div>
        <div style={inputStyle}>
          <User size={16} />
          <span>Actor</span>
        </div>
        <div style={{ flex: 1, ...inputStyle }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por entidad o detalle..."
            disabled
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              cursor: 'not-allowed',
            }}
          />
        </div>
      </div>

      <AuditTable events={auditLog} />
    </div>
  )
}
