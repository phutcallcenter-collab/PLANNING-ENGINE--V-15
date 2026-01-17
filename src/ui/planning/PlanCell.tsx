import React from 'react'
import { Tooltip } from '../components/Tooltip'
import { ResolvedCellState } from '@/application/ui-adapters/cellState'
import { CELL_THEME } from '@/ui/theme/cellTheme'
import type { ISODate } from '../../domain/types'

interface PlanCellProps {
  resolved: ResolvedCellState
  repId: string
  date: ISODate
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

/**
 * PlanCell — Dumb UI component
 * 
 * RULES:
 * - No semantic logic
 * - No domain knowledge
 * - Only paints what it receives
 * - All decisions made in mapper
 */
export const PlanCell = React.memo(function PlanCell({
  resolved,
  onClick,
  onContextMenu,
}: PlanCellProps) {
  const theme = CELL_THEME[resolved.variant]
  const Icon = theme.icon

  const style: React.CSSProperties = {
    flex: 1,
    padding: '10px 8px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 600,
    userSelect: 'none',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    gap: '4px',
    background: theme.bg,
    color: theme.fg,
    border: theme.border ? `1px solid ${theme.border}` : '1px solid #eee',
    borderLeft: '1px solid #eee',
    cursor: resolved.canEdit ? 'pointer' : 'default',
    opacity: resolved.canEdit ? 1 : 0.6,
    borderRadius: '6px',
    transition: 'background-color 120ms ease, transform 100ms ease, box-shadow 120ms ease',
  }

  return (
    <div
      role="gridcell"
      aria-label={resolved.ariaLabel}
      aria-disabled={!resolved.canEdit}
      tabIndex={0}
      style={style}
      onClick={resolved.canEdit ? onClick : undefined}
      onContextMenu={resolved.canContextMenu ? onContextMenu : undefined}
      onKeyDown={e => {
        if (!resolved.canEdit) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <Tooltip content={resolved.tooltip}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Icon && <Icon size={14} strokeWidth={2} />}
          {resolved.label && <span>{resolved.label}</span>}
        </div>
      </Tooltip>
    </div>
  )
})
