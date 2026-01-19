import React, { useState } from 'react'
import { ManagerCellState } from '@/application/ui-adapters/mapManagerDayToCell'
import { MANAGER_DUTY_UI } from './managerDutyUI'
import { ManagerDutySelector } from './ManagerDutySelector'
import { ManagerDuty } from '@/domain/management/types'

export function ManagerCell({
  cell,
  onDutyChange,
  isBlocked,
}: {
  cell: ManagerCellState
  onDutyChange?: (duty: ManagerDuty | null) => void
  isBlocked?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const uiConfig = MANAGER_DUTY_UI[cell.state]

  const handleClick = () => {
    // No abrir si está bloqueado (VAC/LIC) o no hay handler
    if (isBlocked || !onDutyChange || cell.state === 'VACACIONES' || cell.state === 'LICENCIA') {
      return
    }
    setIsEditing(true)
  }

  const handleChange = (duty: ManagerDuty | null) => {
    setIsEditing(false)
    if (onDutyChange && duty !== null) {
      onDutyChange(duty)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div style={{ height: '42px', padding: '2px' }}>
        <ManagerDutySelector
          value={(cell.state === 'OFF' || cell.state === 'EMPTY') ? null : (cell.state as ManagerDuty)}
          onChange={handleChange}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  const isClickable = !isBlocked && onDutyChange && cell.state !== 'VACACIONES' && cell.state !== 'LICENCIA'

  return (
    <div
      title={cell.tooltip}
      onClick={handleClick}
      style={{
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: 600,
        color: uiConfig.fg,
        background: uiConfig.bg,
        border: `1px solid ${'border' in uiConfig ? uiConfig.border : '#e5e7eb'}`,
        borderRadius: '4px',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: isBlocked ? 0.6 : 1,
      }}
    >
      <span>{cell.label}</span>

      {cell.note && cell.state !== 'VACACIONES' && cell.state !== 'LICENCIA' && (
        <span
          style={{
            color: '#9ca3af',
            fontSize: '14px',
          }}
        >
          📝
        </span>
      )}
    </div>
  )
}
