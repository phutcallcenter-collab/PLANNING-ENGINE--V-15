import React from 'react'
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
    flexDirection: 'column',
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

  // Badge styling
  const badgeStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    marginTop: '2px',
    whiteSpace: 'nowrap',
  }

  const badgeColors: Record<string, { bg: string; fg: string }> = {
    CUBIERTO: { bg: '#dbeafe', fg: '#1e40af' },
    CUBRIENDO: { bg: '#f3e8ff', fg: '#6b21a8' },
    AUSENCIA: { bg: '#fee2e2', fg: '#991b1b' },
    VACACIONES: { bg: '#d1fae5', fg: '#065f46' },
    LICENCIA: { bg: '#fce7f3', fg: '#9f1239' },
  }

  return (
    <div
      role="gridcell"
      aria-label={resolved.ariaLabel}
      aria-disabled={!resolved.canEdit}
      title={resolved.tooltip} // ✅ Native tooltip avoids clipping issues
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
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {Icon && <Icon size={14} strokeWidth={2} />}
        {resolved.label && <span>{resolved.label}</span>}
      </div>

      {/* 🔄 NEW: Render badge if present */}
      {resolved.badge && (
        <div
          style={{
            ...badgeStyle,
            background: badgeColors[resolved.badge]?.bg || '#f3f4f6',
            color: badgeColors[resolved.badge]?.fg || '#374151',
          }}
        >
          {resolved.badge === 'CUBIERTO' && '🔄'}
          {resolved.badge === 'CUBRIENDO' && '🤝'}
          {resolved.badge === 'AUSENCIA' && '⚠️'}
          {resolved.badge === 'VACACIONES' && '🏖️'}
          {resolved.badge === 'LICENCIA' && '📋'}
        </div>
      )}
    </div>
  )
})
