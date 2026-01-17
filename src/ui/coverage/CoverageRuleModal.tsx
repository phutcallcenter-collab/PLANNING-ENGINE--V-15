'use client'

import React, { useState } from 'react'
import type {
  CoverageRule,
  CoverageRuleScope,
  ShiftType,
} from '../../domain/types'

interface Props {
  rule?: CoverageRule
  onSave: (rule: CoverageRule) => void
  onClose: () => void
}

export function CoverageRuleModal({ rule, onSave, onClose }: Props) {
  const [type, setType] = useState<CoverageRuleScope['type']>(
    rule?.scope.type ?? 'SHIFT'
  )
  const [shift, setShift] = useState<ShiftType>(
    rule?.scope.type === 'SHIFT' ? rule.scope.shift : 'DAY'
  )
  const [date, setDate] = useState(
    rule?.scope.type === 'DATE'
      ? rule.scope.date
      : new Date().toISOString().split('T')[0]
  )
  const [required, setRequired] = useState(rule?.required ?? 1)
  const [label, setLabel] = useState(rule?.label ?? '')

  const handleSubmit = () => {
    // Initialize with a default to satisfy TS and handle unexpected types (like WEEKDAY if not implemented in UI)
    let scope: CoverageRuleScope = { type: 'GLOBAL' }

    switch (type) {
      case 'GLOBAL':
        scope = { type: 'GLOBAL' }
        break
      case 'SHIFT':
        scope = { type: 'SHIFT', shift }
        break
      case 'DATE':
        scope = { type: 'DATE', date }
        break
    }

    const newRule: CoverageRule = {
      id: rule?.id ?? `rule-${crypto.randomUUID()}`,
      required: Math.max(0, required),
      scope,
      label: label.trim() || undefined,
    }
    onSave(newRule)
  }

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  }

  const modalContentStyle: React.CSSProperties = {
    background: 'var(--bg-panel)',
    padding: '25px',
    borderRadius: '12px',
    width: '450px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid var(--border-strong)',
    borderRadius: '6px',
    boxSizing: 'border-box',
    marginTop: '8px',
    background: 'var(--bg-muted)',
    color: 'var(--text-main)',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 600,
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-main)' }}>
          {rule ? 'Editar Regla' : 'Nueva Regla'} de Cobertura
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 500, color: 'var(--text-main)' }}>
            Ámbito de la Regla
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value as any)}
            style={inputStyle}
          >
            <option value="SHIFT">Por Turno</option>
            <option value="DATE">Por Fecha Específica</option>
            <option value="GLOBAL">Global</option>
          </select>
        </div>

        {type === 'SHIFT' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 500, color: 'var(--text-main)' }}>Turno</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value as ShiftType)}
              style={inputStyle}
            >
              <option value="DAY">Día</option>
              <option value="NIGHT">Noche</option>
            </select>
          </div>
        )}

        {type === 'DATE' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 500, color: 'var(--text-main)' }}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 500, color: 'var(--text-main)' }}>
            Mínimo de Personas Requeridas
          </label>
          <input
            type="number"
            min="0"
            value={required}
            onChange={e => setRequired(parseInt(e.target.value, 10) || 0)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontWeight: 500, color: 'var(--text-main)' }}>
            Etiqueta (opcional)
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ej: Feriado Nacional, Evento especial"
            style={inputStyle}
          />
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
        >
          <button
            onClick={onClose}
            style={{ ...buttonStyle, background: '#f3f4f6', color: 'var(--text-main)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...buttonStyle,
              background: 'var(--accent)',
              color: 'white',
            }}
          >
            Guardar Regla
          </button>
        </div>
      </div>
    </div>
  )
}

