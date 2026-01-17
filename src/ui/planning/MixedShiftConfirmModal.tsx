'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ShiftAssignment, ShiftType } from '@/domain/types'
import { Sun, Moon, XCircle } from 'lucide-react'

interface Props {
  activeShift: ShiftType
  onClose: () => void
  onSelect: (assignment: ShiftAssignment) => void
}

export function MixedShiftConfirmModal({
  activeShift,
  onClose,
  onSelect,
}: Props) {
  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    background: '#f9fafb',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '12px',
    transition: 'background 0.2s, border-color 0.2s',
  }

  const hoverStyle: React.CSSProperties = {
    background: '#eff6ff',
    borderColor: '#93c5fd',
  }

  const buttonTextStyle: React.CSSProperties = {
    fontWeight: 600,
  }

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          background: 'var(--bg-panel)',
          padding: '24px',
          borderRadius: '12px',
          width: '420px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '18px' }}>
          ⚠️ Modificación de Turno Mixto
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '24px', lineHeight: 1.5 }}>
          Este representante está programado para <b>DÍA y NOCHE</b> hoy.
          <br />
          Tu acción afectará su planificación. ¿Qué deseas hacer?
        </p>

        <div>
          <button
            style={buttonStyle}
            onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, buttonStyle)}
            onClick={() => onSelect({ type: 'NONE' })}
          >
            <XCircle size={20} color="#ef4444" />
            <span style={buttonTextStyle}>Libre todo el día</span>
          </button>
          <button
            style={buttonStyle}
            onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, buttonStyle)}
            onClick={() => onSelect({ type: 'SINGLE', shift: 'DAY' })}
          >
            <Sun size={20} color="#f59e0b" />
            <span style={buttonTextStyle}>Trabaja solo Turno Día</span>
          </button>
          <button
            style={buttonStyle}
            onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, buttonStyle)}
            onClick={() => onSelect({ type: 'SINGLE', shift: 'NIGHT' })}
          >
            <Moon size={20} color="#4f46e5" />
            <span style={buttonTextStyle}>Trabaja solo Turno Noche</span>
          </button>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: '#e5e7eb',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

