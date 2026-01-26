// src/ui/stats/audit/AuditActionBadge.tsx
'use client'

import { AuditEventType } from '@/domain/audit/types'
import React from 'react'

const ACTION_STYLES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  // Incident Actions (Amber/Yellow)
  INCIDENT_CREATED: {
    label: 'Incidencia Creada',
    bg: '#fefce8',
    text: '#a16207',
  },
  INCIDENT_DELETED: {
    label: 'Incidencia Eliminada',
    bg: '#fff7ed',
    text: '#c2410c',
  },

  // Planning Actions (Blue)
  OVERRIDE_APPLIED: {
    label: 'Cambio de Turno',
    bg: '#eff6ff',
    text: '#1d4ed8',
  },
  OVERRIDE_REVERTED: {
    label: 'Cambio Revertido',
    bg: '#e0e7ff',
    text: '#312e81',
  },

  // Rule Actions (Green)
  COVERAGE_RULE_CREATED: {
    label: 'Regla Creada',
    bg: '#f0fdf4',
    text: '#15803d',
  },
  COVERAGE_RULE_UPDATED: {
    label: 'Regla Actualizada',
    bg: '#dcfce7',
    text: '#166534',
  },
  COVERAGE_RULE_DELETED: {
    label: 'Regla Eliminada',
    bg: '#f0fdf4',
    text: '#15803d',
  },

  // Calendar Actions (Amber/Yellow)
  SPECIAL_DAY_SET: {
    label: 'Día Especial',
    bg: '#fef9c3',
    text: '#854d0e',
  },
  SPECIAL_DAY_CLEARED: {
    label: 'Día Normalizado',
    bg: '#fefce8',
    text: '#a16207',
  },

  // System Actions (Red/Gray)
  APP_STATE_RESET: {
    label: 'Reset de Sistema',
    bg: '#fee2e2',
    text: '#991b1b',
  },
  DATA_IMPORTED: { label: 'Importación', bg: '#e5e7eb', text: '#4b5563' },
  DATA_EXPORTED: { label: 'Exportación', bg: '#e5e7eb', text: '#4b5563' },
}

export function AuditActionBadge({ action }: { action: AuditEventType | string }) {
  const style = ACTION_STYLES[action] || {
    label: action,
    bg: '#f3f4f6',
    text: '#4b5563',
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  )
}
