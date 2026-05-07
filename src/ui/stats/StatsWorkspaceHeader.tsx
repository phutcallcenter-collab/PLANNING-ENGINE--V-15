'use client'

import type { ComponentType } from 'react'
import { useMemo, useRef } from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

export type StatsWorkspaceReportId =
  | 'monthly'
  | 'points'
  | 'operational'
  | 'callcenter'

export type StatsWorkspaceReportItem = {
  id: StatsWorkspaceReportId
  label: string
  description: string
  icon: ComponentType<{ size?: number }>
}

interface StatsWorkspaceHeaderProps {
  activeReport: StatsWorkspaceReportId
  reports: StatsWorkspaceReportItem[]
  currentDate: Date
  showMonthControls: boolean
  onDateChange: (nextDate: Date) => void
  onReportChange: (report: StatsWorkspaceReportId) => void
}

function reportButtonStyle(isActive: boolean) {
  return {
    padding: '10px 14px',
    cursor: 'pointer',
    border: `1px solid ${
      isActive ? 'rgba(var(--accent-rgb), 0.18)' : 'rgba(202, 189, 168, 0.3)'
    }`,
    color: isActive ? 'var(--accent-strong)' : 'var(--text-muted)',
    fontWeight: isActive ? 700 : 600,
    background: isActive
      ? 'linear-gradient(180deg, var(--surface-raised) 0%, rgba(255,255,255,0.68) 100%)'
      : 'rgba(255,255,255,0.52)',
    fontSize: '13px',
    borderRadius: '14px',
    boxShadow: isActive ? '0 10px 20px rgba(var(--accent-rgb), 0.1)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '180px',
    textAlign: 'left',
  } as const
}

export function StatsWorkspaceHeader({
  activeReport,
  reports,
  currentDate,
  showMonthControls,
  onDateChange,
  onReportChange,
}: StatsWorkspaceHeaderProps) {
  const monthInputRef = useRef<HTMLInputElement | null>(null)

  const monthControlLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: es }),
    [currentDate]
  )

  const openMonthPicker = () => {
    const input = monthInputRef.current

    if (!input) return

    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }

    input.click()
  }

  return (
    <section
      className="report-screen-only"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '18px',
        border: '1px solid var(--shell-border)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(248,242,233,0.52) 100%)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          flex: 1,
        }}
      >
        {reports.map(report => {
          const Icon = report.icon

          return (
            <button
              key={report.id}
              type="button"
              style={reportButtonStyle(activeReport === report.id)}
              aria-pressed={activeReport === report.id}
              onClick={() => onReportChange(report.id)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={14} />
                <span>{report.label}</span>
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color:
                    activeReport === report.id
                      ? 'var(--text-main)'
                      : 'var(--text-muted)',
                }}
              >
                {report.description}
              </span>
            </button>
          )
        })}
      </div>

      {showMonthControls ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px',
              borderRadius: '16px',
              border: '1px solid var(--shell-border)',
              background: 'rgba(255,255,255,0.74)',
            }}
          >
            <button
              type="button"
              onClick={() => onDateChange(subMonths(currentDate, 1))}
              aria-label="Mes anterior"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
              }}
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>

            <div
              style={{
              minWidth: '170px',
                padding: '0 10px',
                textAlign: 'center',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: 800,
                textTransform: 'capitalize',
                letterSpacing: '-0.02em',
              }}
            >
              {monthControlLabel}
            </div>

            <button
              type="button"
              onClick={() => onDateChange(addMonths(currentDate, 1))}
              aria-label="Mes siguiente"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
              }}
            >
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>
          </div>

          <button
            type="button"
            onClick={openMonthPicker}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '14px',
              border: '1px solid var(--shell-border)',
              background: 'rgba(255,255,255,0.74)',
              color: 'var(--text-main)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <CalendarDays size={15} strokeWidth={2.2} />
            Elegir mes
          </button>

          <input
            ref={monthInputRef}
            type="month"
            value={format(currentDate, 'yyyy-MM')}
            onChange={event => {
              if (!event.target.value) return

              onDateChange(new Date(`${event.target.value}-01T12:00:00`))
            }}
            aria-label="Elegir mes"
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 1,
              height: 1,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '14px',
              border: '1px solid var(--shell-border)',
              background: 'rgba(255,255,255,0.72)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {activeReport === 'operational'
              ? 'Resumen operativo alineado con el historial cargado de Call Center'
              : 'Call Center mantiene sus subpestañas internas dentro de esta misma entrada'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Sin controles temporales duplicados en la cinta principal.
          </div>
        </div>
      )}
    </section>
  )
}
