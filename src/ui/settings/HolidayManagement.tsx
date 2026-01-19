'use client'

import React, { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { SpecialDay, ISODate } from '@/domain/types'
import { Trash2, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { useEditMode } from '@/hooks/useEditMode'

export function HolidayManagement() {
  const { calendar, addOrUpdateSpecialDay, removeSpecialDay } = useAppStore(s => ({
    calendar: s.calendar,
    addOrUpdateSpecialDay: s.addOrUpdateSpecialDay,
    removeSpecialDay: s.removeSpecialDay,
  }))

  const { mode } = useEditMode()

  const [newDate, setNewDate] = useState('')
  const [newLabel, setNewLabel] = useState('')

  // Solo mostrar feriados (HOLIDAY), no otros días especiales
  const holidays = calendar.specialDays
    .filter(d => d.kind === 'HOLIDAY')
    .sort((a, b) => a.date.localeCompare(b.date))

  const handleAdd = () => {
    if (!newDate.trim()) {
      alert('Debe ingresar una fecha')
      return
    }
    if (!newLabel.trim()) {
      alert('Debe ingresar un nombre para el feriado')
      return
    }

    const specialDay: SpecialDay = {
      date: newDate as ISODate,
      kind: 'HOLIDAY',
      label: newLabel.trim(),
    }

    addOrUpdateSpecialDay(specialDay)

    // Limpiar formulario
    setNewDate('')
    setNewLabel('')
  }

  const handleDelete = (date: ISODate) => {
    if (confirm('¿Eliminar este feriado?')) {
      removeSpecialDay(date)
    }
  }

  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate + 'T12:00:00Z')
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return isoDate
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px', fontSize: '20px', color: 'var(--text-main)' }}>
          Feriados del Año
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          Los días marcados como feriados serán excluidos automáticamente del cálculo de vacaciones.
        </p>
      </div>

      {/* Formulario para agregar */}
      <div
        style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-main)' }}>
          Agregar Feriado
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 160px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                color: 'var(--text-main)',
              }}
            >
              Fecha
            </label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              aria-label="Fecha del feriado"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                color: 'var(--text-main)',
              }}
            >
              Nombre del Feriado
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Ej: Día de la Independencia"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              onKeyPress={e => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '8px 16px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            Agregar
          </button>
        </div>
      </div>

      {/* Lista de feriados */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-main)' }}>
          Feriados Configurados ({holidays.length})
        </h3>

        {holidays.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <CalendarIcon size={48} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              No hay feriados configurados
            </p>
            <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '13px' }}>
              Agregue los feriados del año para que se excluyan del cálculo de vacaciones
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {holidays.map(holiday => (
              <div
                key={holiday.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '4px',
                      height: '40px',
                      background: '#fbbf24',
                      borderRadius: '2px',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                      {holiday.label}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatDate(holiday.date)}
                    </div>
                  </div>
                </div>
                {mode === 'ADMIN_OVERRIDE' && (
                  <button
                    onClick={() => handleDelete(holiday.date)}
                    aria-label={`Eliminar feriado ${holiday.label}`}
                    title="Eliminar feriado"
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

