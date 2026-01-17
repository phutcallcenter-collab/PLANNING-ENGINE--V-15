'use client'

import React from 'react'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface InlineAlertProps {
  variant: 'warning' | 'error' | 'info'
  children: React.ReactNode
}

export function InlineAlert({ variant, children }: InlineAlertProps) {
  const styles = {
    warning: {
      background: '#fef3c7',
      border: '1px solid #fbbf24',
      color: '#92400e',
      icon: <AlertTriangle size={18} />,
    },
    error: {
      background: '#fee2e2',
      border: '1px solid #ef4444',
      color: '#991b1b',
      icon: <AlertCircle size={18} />,
    },
    info: {
      background: '#dbeafe',
      border: '1px solid #3b82f6',
      color: '#1e40af',
      icon: <Info size={18} />,
    },
  }

  const style = styles[variant]

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '6px',
        background: style.background,
        border: style.border,
        color: style.color,
        fontSize: '13px',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ marginTop: '1px', flexShrink: 0 }}>{style.icon}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
