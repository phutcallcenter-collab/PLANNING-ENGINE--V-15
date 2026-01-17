'use client'

import React from 'react'
import { Tooltip } from '../../components/Tooltip'

export const StatCard = ({
  label,
  value,
  Icon,
  variant = 'neutral',
  tooltipContent,
}: {
  label: string
  value: string | number
  Icon: React.ElementType
  variant?: 'neutral' | 'danger' | 'warning'
  tooltipContent?: React.ReactNode
}) => {
  const valueColor = {
    danger: '#dc2626',
    warning: '#f97316',
    neutral: '#111827',
  }[variant]

  const card = (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: `1px solid #e5e7eb`,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          background: '#f3f4f6',
          padding: '10px',
          borderRadius: '50%',
        }}
      >
        <Icon size={24} style={{ color: '#4b5563' }} />
      </div>
      <div>
        <div
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: valueColor,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )

  return tooltipContent ? <Tooltip content={tooltipContent}>{card}</Tooltip> : card
}

