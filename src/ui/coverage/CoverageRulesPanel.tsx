'use client'

import React from 'react'
import type { CoverageRule } from '../../domain/types'
import { CoverageRuleRow } from './CoverageRuleRow'

export function CoverageRulesPanel({ onNavigateToSettings }: { onNavigateToSettings: () => void }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '10px',
        }}
      >
        <h3 style={{ margin: 0, color: '#111827', fontSize: '16px' }}>Demanda Operativa</h3>
      </header>

      <p
        style={{
          margin: '0 0 15px 0',
          fontSize: '13px',
          color: '#6b7280',
          lineHeight: '1.5',
        }}
      >
        La cantidad mínima de personal se define por día y turno.
      </p>

      <button
        onClick={onNavigateToSettings}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        Ver configuración →
      </button>
    </div>
  )
}
