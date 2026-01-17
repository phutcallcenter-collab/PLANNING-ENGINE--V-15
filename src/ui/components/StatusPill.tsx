'use client'

import React from 'react'

export type StatusVariant = 'ok' | 'warning' | 'danger' | 'info' | 'neutral'

interface StatusPillProps {
  label: string
  value?: string | number
  variant?: StatusVariant
  className?: string
}

const VARIANT_STYLES: Record<
  StatusVariant,
  { background: string; color: string }
> = {
  ok: {
    background: 'hsl(142.1, 80%, 96%)',
    color: 'hsl(142.1, 76.2%, 25%)',
  },
  warning: {
    background: 'hsl(45, 100%, 96%)',
    color: 'hsl(45, 80%, 25%)',
  },
  danger: {
    background: 'hsl(0, 100%, 97%)',
    color: 'hsl(0, 80%, 45%)',
  },
  info: {
    background: 'hsl(210, 100%, 96%)',
    color: 'hsl(210, 80%, 35%)',
  },
  neutral: {
    background: 'hsl(220, 15%, 96%)',
    color: 'hsl(220, 10%, 40%)',
  },
}

export function StatusPill({
  label,
  value,
  variant = 'neutral',
  className = '',
}: StatusPillProps) {
  const style = VARIANT_STYLES[variant]

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '1.5',
    ...style,
  }

  return (
    <div style={baseStyle} className={className}>
      <span>{label}</span>
      {value !== undefined && (
        <span style={{ fontWeight: 600 }}>{value}</span>
      )}
    </div>
  )
}
