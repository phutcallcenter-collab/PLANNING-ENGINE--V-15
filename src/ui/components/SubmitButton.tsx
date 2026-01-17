'use client'

import React from 'react'
import { Loader2, Check, AlertTriangle } from 'lucide-react'

type Props = {
  state: 'idle' | 'loading' | 'success' | 'error'
  label?: string
  disabled?: boolean
}

function getBaseStyle(): React.CSSProperties {
  return {
    width: '100%',
    height: '44px',
    borderRadius: '6px',
    fontWeight: 500,
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    cursor: 'pointer',
  }
}

export function SubmitButton({ state, label = 'Registrar', disabled = false }: Props) {
  const baseStyle = getBaseStyle()

  if (disabled) {
    return (
      <button
        disabled
        style={{
          ...baseStyle,
          backgroundColor: '#e5e7eb', // bg-gray-200
          color: '#9ca3af', // text-gray-400
          cursor: 'not-allowed',
        }}
      >
        {label}
      </button>
    )
  }

  if (state === 'loading') {
    return (
      <button
        disabled
        style={{
          ...baseStyle,
          backgroundColor: '#f3f4f6', // bg-muted
          color: '#6b7280', // text-muted-foreground
        }}
      >
        <Loader2 className="animate-spin" size={16} />
        Procesando...
      </button>
    )
  }

  if (state === 'success') {
    return (
      <button
        disabled
        style={{
          ...baseStyle,
          backgroundColor: '#16a34a', // bg-green-600
          color: 'white',
        }}
      >
        <Check size={18} /> Guardado
      </button>
    )
  }

  if (state === 'error') {
    return (
      <button
        disabled
        style={{
          ...baseStyle,
          backgroundColor: '#dc2626', // bg-red-600
          color: 'white',
        }}
      >
        <AlertTriangle size={18} /> Error
      </button>
    )
  }

  return (
    <button
      style={{
        ...baseStyle,
        backgroundColor: '#111827', // bg-black
        color: 'white',
      }}
    >
      {label}
    </button>
  )
}
