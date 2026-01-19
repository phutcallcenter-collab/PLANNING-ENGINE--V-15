'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'

interface VacationConfirmationProps {
  isOpen: boolean
  repName: string
  startDate: string
  endDate: string
  returnDate: string
  workingDays: number
  onClose: () => void
}

export function VacationConfirmation({
  isOpen,
  repName,
  startDate,
  endDate,
  returnDate,
  workingDays,
  onClose,
}: VacationConfirmationProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000) // Auto-cerrar después de 5 segundos
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate + 'T12:00:00Z')
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return isoDate
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: '#10b981',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} style={{ color: 'white' }} />
                <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                  Vacaciones Registradas
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar confirmación"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} style={{ color: 'white' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {repName}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Desde:</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 500 }}>
                    {formatDate(startDate)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Hasta:</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 500 }}>
                    {formatDate(endDate)}
                  </span>
                </div>
                <div
                  style={{
                    height: '1px',
                    background: '#e5e7eb',
                    margin: '6px 0',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Reingresa:</span>
                  <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 600 }}>
                    {formatDate(returnDate)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ color: '#15803d', fontSize: '13px', fontWeight: 500 }}>
                  ({workingDays} días laborables)
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

