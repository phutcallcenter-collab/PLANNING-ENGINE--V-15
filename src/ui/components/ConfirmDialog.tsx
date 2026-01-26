'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

type ConfirmIntent = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  intent?: ConfirmIntent
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  intent = 'info',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {

  if (!open) return null

  const colorMap: Record<ConfirmIntent, React.CSSProperties> = {
    danger: {
      backgroundColor: '#dc2626',
      color: 'white',
    },
    warning: {
      backgroundColor: '#f59e0b',
      color: 'black',
    },
    info: {
      backgroundColor: '#2563eb',
      color: 'white',
    },
  }

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100, // High priority - must appear above all other modals
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '28rem',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  }

  return (
    <div style={modalOverlayStyle} onClick={onCancel}>
      <motion.div
        style={modalContentStyle}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <div style={{ padding: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            {title}
          </h2>
          {description && (
            <div
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '1.5rem',
                lineHeight: '1.5',
              }}
            >
              {description}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              marginTop: '1.5rem',
            }}
          >
            <button
              onClick={onCancel}
              style={{
                ...buttonStyle,
                backgroundColor: '#f3f4f6',
                color: '#374151',
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              style={{
                ...buttonStyle,
                ...colorMap[intent],
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
