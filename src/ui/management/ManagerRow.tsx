import React from 'react'
import { ManagerCell } from './ManagerCell'
import { ManagerCellState } from '@/application/ui-adapters/mapManagerDayToCell'
import { ManagerDuty } from '@/domain/management/types'
import { ISODate } from '@/domain/types'

export function ManagerRow({
  name,
  cells,
  dates,
  onDutyChange,
}: {
  name: string
  cells: ManagerCellState[]
  dates: ISODate[]
  onDutyChange?: (date: ISODate, duty: ManagerDuty | null) => void
}) {
  return (
    <>
      <div style={{ fontWeight: 600, padding: '8px' }}>{name}</div>
      {cells.map((cell, idx) => (
        <ManagerCell
          key={idx}
          cell={cell}
          onDutyChange={onDutyChange ? (duty) => onDutyChange(dates[idx], duty) : undefined}
          isBlocked={cell.state === 'VACACIONES' || cell.state === 'LICENCIA'}
        />
      ))}
    </>
  )
}
