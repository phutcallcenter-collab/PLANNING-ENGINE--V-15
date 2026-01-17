'use client'

import React, { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useEditMode } from '@/hooks/useEditMode'

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { mode, toggle } = useEditMode()
  const { resetState, showConfirm } = useAppStore(s => ({
    resetState: s.resetState,
    showConfirm: s.showConfirm,
  }))

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid var(--border-strong)',
    borderRadius: '6px',
    background: 'var(--bg-panel)',
    cursor: 'pointer',
  }

  const dropdownItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 15px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
  }

  const placeholderClick = (feature: string) => {
    alert(`Placeholder para la función: ${feature}`)
    setIsOpen(false)
  }

  const handleToggleEditMode = () => {
    toggle()
    setIsOpen(false)
  }

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: '⚠️ ¿Reiniciar la planificación?',
      description: (
        <>
          <p>
            Esta acción eliminará todas las incidencias y ajustes manuales
            (ausencias, tardanzas, cambios de turno, etc.).
          </p>
          <p style={{ marginTop: '10px', fontWeight: 500 }}>
            Se conservarán las licencias y vacaciones ya registradas.
          </p>
          <p
            style={{
              marginTop: '10px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            Esta acción no se puede deshacer.
          </p>
        </>
      ),
      intent: 'danger',
      confirmLabel: 'Sí, reiniciar',
    });

    if (confirmed) {
      resetState(true); // pass true to keep formal incidents
    }
    setIsOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ ...buttonStyle, fontWeight: 600 }}
      >
        Ajustes ⚙️
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10,
            width: '240px',
            padding: '8px 0',
          }}
        >
          <button
            style={{
              ...dropdownItemStyle,
              background:
                mode === 'ADMIN_OVERRIDE' ? '#fefce8' : 'transparent',
              color: mode === 'ADMIN_OVERRIDE' ? '#a16207' : '#1f2937',
              fontWeight: mode === 'ADMIN_OVERRIDE' ? 600 : 400,
            }}
            onClick={handleToggleEditMode}
            title="Permite modificar semanas pasadas. Usar con precaución."
          >
            {mode === 'ADMIN_OVERRIDE'
              ? '✓ Modo Edición Avanzada'
              : 'Modo Edición Avanzada'}
          </button>
          <div
            style={{
              height: '1px',
              background: '#e5e7eb',
              margin: '8px 0',
            }}
          />
          <button
            style={dropdownItemStyle}
            onClick={() => placeholderClick('Importar')}
          >
            Importar
          </button>
          <button
            style={dropdownItemStyle}
            onClick={() => placeholderClick('Exportar')}
          >
            Exportar
          </button>
          <div
            style={{
              height: '1px',
              background: '#e5e7eb',
              margin: '8px 0',
            }}
          />
          <button
            style={dropdownItemStyle}
            onClick={() => placeholderClick('Historial')}
          >
            Historial
          </button>
          <button
            style={dropdownItemStyle}
            onClick={() => placeholderClick('Auditoría')}
          >
            Auditoría
          </button>
          <div
            style={{
              height: '1px',
              background: '#e5e7eb',
              margin: '8px 0',
            }}
          />
          <button
            style={{
              ...dropdownItemStyle,
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 500,
            }}
            onClick={handleReset}
          >
            Resetear Planificación
          </button>
        </div>
      )}
    </div>
  )
}

