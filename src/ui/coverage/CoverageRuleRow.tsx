'use client'

import React from 'react'
import type { CoverageRule } from '../../domain/types'
import { useEditMode } from '@/hooks/useEditMode'

function getRuleLabel(rule: CoverageRule): string {
  switch (rule.scope.type) {
    case 'GLOBAL':
      return 'Global'
    case 'SHIFT':
      return `Turno ${rule.scope.shift === 'DAY' ? 'Día' : 'Noche'}`
    case 'DATE':
      const date = new Date(rule.scope.date + 'T12:00:00Z')
      return `Fecha: ${date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}`
    default:
      return 'Regla desconocida'
  }
}

export function CoverageRuleRow({
  rule,
  onEdit,
  onDelete,
}: {
  rule: CoverageRule
  onEdit: () => void
  onDelete: () => void
}) {
  const { mode } = useEditMode()
  const label = getRuleLabel(rule)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        background: 'var(--bg-panel)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          {rule.label || label}
        </div>
        <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '2px' }}>
          Mínimo:{' '}
          <strong style={{ color: 'var(--text-main)' }}>{rule.required}</strong> personas
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onEdit}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-panel)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Editar
        </button>
        {mode === 'ADMIN_OVERRIDE' && (
          <button
            onClick={onDelete}
            style={{
              padding: '6px 10px',
              border: 'none',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

