'use client'

import React from 'react'

interface Props {
  onCreateRule: () => void
}

export function CoverageEmptyState({ onCreateRule }: Props) {
  return (
    <div
      style={{
        padding: '32px',
        border: '1px dashed #d1d5db',
        borderRadius: '12px',
        background: '#f9fafb',
        textAlign: 'center',
        color: '#374151',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '8px', fontWeight: 600 }}>
        No hay reglas de cobertura definidas
      </h3>
      <p style={{ marginBottom: '20px', fontSize: '14px', color: '#6b7280' }}>
        El análisis de cobertura solo se muestra cuando existen reglas de mínimo
        de personal para este turno o fechas específicas.
      </p>
      <button
        onClick={onCreateRule}
        style={{
          padding: '8px 14px',
          borderRadius: '6px',
          border: 'none',
          background: '#111827',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        + Crear regla de cobertura
      </button>
    </div>
  )
}
