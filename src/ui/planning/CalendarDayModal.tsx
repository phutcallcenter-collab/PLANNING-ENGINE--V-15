'use client'

import React, { useState, useEffect } from 'react'
import type { DayInfo, DayKind, SpecialDay } from '../../domain/types'

interface CalendarDayModalProps {
  day: DayInfo
  onClose: () => void
  onSave: (specialDay: SpecialDay) => void
  onClear: (date: string) => void
}

function getBaseKindForDay(dayOfWeek: number): DayKind {
  return 'WORKING'
}

export function CalendarDayModal({
  day,
  onClose,
  onSave,
  onClear,
}: CalendarDayModalProps) {
  const [kind, setKind] = useState<'WORKING' | 'HOLIDAY'>(
    day.kind === 'HOLIDAY' ? 'HOLIDAY' : 'WORKING'
  )
  const [label, setLabel] = useState(day.label ?? '')

  useEffect(() => {
    setKind(day.kind === 'HOLIDAY' ? 'HOLIDAY' : 'WORKING')
    setLabel(day.label ?? '')
  }, [day])

  const handleSave = () => {
    onSave({
      date: day.date,
      kind,
      label: label.trim() || undefined,
    })
    onClose()
  }

  const handleClear = () => {
    onClear(day.date)
    onClose()
  }

  const baseKind = getBaseKindForDay(day.dayOfWeek)
  const baseKindLabel = 'Laborable'

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
    zIndex: 1000,
  }

  const modalContentStyle: React.CSSProperties = {
    background: 'var(--bg-panel)',
    padding: '25px',
    borderRadius: '12px',
    width: '400px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid var(--border-strong)',
    borderRadius: '6px',
    boxSizing: 'border-box',
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
          Editar Día:{' '}
          {new Date(day.date + 'T12:00:00Z').toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-main)' }}
          >
            Tipo de Día
          </label>
          <select
            value={kind}
            onChange={e => setKind(e.target.value as 'WORKING' | 'HOLIDAY')}
            style={inputStyle}
          >
            <option value="WORKING">Laborable</option>
            <option value="HOLIDAY">Feriado (Laborable)</option>
          </select>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: '5px' }}>
            El estado base de este día es: <strong>{baseKindLabel}</strong>.
          </p>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-main)' }}
          >
            Etiqueta (opcional)
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ej: Navidad, Día del Trabajador"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {day.isSpecial && (
              <button
                onClick={handleClear}
                style={{
                  ...buttonStyle,
                  background: '#fee2e2',
                  color: '#991b1b',
                }}
              >
                Quitar Excepción
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{ ...buttonStyle, background: '#f3f4f6', color: 'var(--text-main)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              style={{
                ...buttonStyle,
                background: '#111827',
                color: 'white',
              }}
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

