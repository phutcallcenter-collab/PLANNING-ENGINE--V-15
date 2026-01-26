'use client'

import React, { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { format, subDays, startOfQuarter, endOfQuarter } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Sun,
  Moon,
  Users,
  Award,
  BarChart,
  Target,
  FileText,
} from 'lucide-react'
import { selectExecutiveReport } from '@/store/selectors/selectExecutiveReport'
import {
  ExecutiveReport,
  ExecutivePersonSummary,
  IncidentTypeStats,
} from '@/domain/executiveReport/types'
import { INCIDENT_STYLES } from '@/domain/incidents/incidentStyles'

const PERIOD_OPTIONS = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Este Trimestre', days: 'quarter' },
  { label: 'Últimos 90 días', days: 90 },
]

const ReportHeader = ({
  onPeriodChange,
}: {
  onPeriodChange: (days: number | 'quarter') => void
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb',
    }}
  >
    <div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          margin: 0,
        }}
      >
        Reporte Ejecutivo de Desempeño
      </h2>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
        Vista panorámica de incidencias y rendimiento del equipo.
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <select
        onChange={e => onPeriodChange(e.target.value as any)}
        defaultValue={30}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border-strong)',
          borderRadius: '6px',
          background: 'var(--bg-panel)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {PERIOD_OPTIONS.map(opt => (
          <option key={opt.label} value={opt.days}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  </div>
)

const KPICard = ({
  label,
  value,
  Icon,
}: {
  label: string
  value: string | number
  Icon: React.ElementType
}) => (
  <div
    style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '16px',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-muted)',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      <Icon size={16} />
      <span>{label}</span>
    </div>
    <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>
      {value}
    </div>
  </div>
)

const ShiftCard = ({
  shift,
  stats,
}: {
  shift: 'DAY' | 'NIGHT'
  stats: ExecutiveReport['shifts'][typeof shift]
}) => (
  <div
    style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '16px',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: shift === 'DAY' ? '#b45309' : '#312e81',
        fontSize: '16px',
        fontWeight: 600,
      }}
    >
      {shift === 'DAY' ? <Sun size={18} /> : <Moon size={18} />}
      <span>Turno {shift === 'DAY' ? 'Día' : 'Noche'}</span>
    </div>
    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-around' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Incidencias</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.incidents}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Puntos</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.points}</div>
      </div>
    </div>
  </div>
)

const PersonList = ({
  title,
  data,
  icon: Icon,
  variant,
}: {
  title: string
  data: ExecutivePersonSummary[]
  icon: React.ElementType
  variant: 'success' | 'danger'
}) => {
  const cellStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '14px',
    borderTop: '1px solid #f3f4f6',
  }

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        background: 'var(--bg-panel)',
        height: '100%',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          color: variant === 'success' ? '#059669' : '#b91c1c',
        }}
      >
        <Icon size={20} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{title} ({data.length})</h3>
      </header>
      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {data.map(rep => (
              <tr key={rep.repId}>
                <td style={{ ...cellStyle, fontWeight: 500 }}>{rep.name}</td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: 'right',
                    fontWeight: 700,
                    color: variant === 'danger' && rep.points > 0 ? '#b91c1c' : '#374151',
                  }}
                >
                  {rep.points > 0 ? `${rep.points} pts` : ''}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={2} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No hay representantes en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const IncidentTypeBreakdown = ({ data }: { data: IncidentTypeStats[] }) => {
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        background: 'var(--bg-panel)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <FileText size={18} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Desglose por Tipo de Incidencia</h3>
      </header>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map(item => {
          const style = INCIDENT_STYLES[item.type] || INCIDENT_STYLES.OTRO
          return (
            <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '14px' }}>{style.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '14px' }}><strong>{item.count}</strong> evento(s)</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#b91c1c' }}>{item.points} pts</span>
              </div>
            </div>
          )
        })}
        {data.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0' }}>
            No hay incidencias punitivas en este período.
          </div>
        )}
      </div>
    </div>
  )
}

export function ExecutiveReportView() {
  const [period, setPeriod] = useState<number | 'quarter'>(30)

  const { from, to } = useMemo(() => {
    const endDate = new Date()
    let startDate: Date
    if (period === 'quarter') {
      startDate = startOfQuarter(endDate)
    } else {
      startDate = subDays(endDate, period)
    }
    return {
      from: format(startDate, 'yyyy-MM-dd'),
      to: format(endDate, 'yyyy-MM-dd'),
    }
  }, [period])

  const report = useAppStore(state => selectExecutiveReport(state, from, to))

  if (!report) {
    return <div>Cargando reporte...</div>
  }

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <ReportHeader onPeriodChange={setPeriod} />

      {/* KPIs - Conclusión */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '32px',
        }}
      >
        <KPICard label="Total Incidencias" value={report.kpis.totalIncidents} Icon={BarChart} />
        <KPICard label="Total Puntos" value={report.kpis.totalPoints} Icon={TrendingDown} />
      </div>

      {/* Requieren Atención - Riesgo primero */}
      <div style={{ marginBottom: '24px' }}>
        <PersonList title="Requieren Atención" data={report.needsAttention} icon={TrendingDown} variant="danger" />
      </div>

      {/* Candidatos Destacados - Reconocimiento después */}
      <div style={{ marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px dashed #e5e7eb' }}>
        <PersonList title="Candidatos Destacados" data={report.candidates} icon={Award} variant="success" />
      </div>

      {/* Turnos - Contexto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '24px' }}>
        <ShiftCard shift="DAY" stats={report.shifts.DAY} />
        <ShiftCard shift="NIGHT" stats={report.shifts.NIGHT} />
      </div>

      {/* Desglose por Tipo - Auditoría */}
      <div style={{ marginTop: '16px' }}>
        <IncidentTypeBreakdown data={report.incidentTypes} />
      </div>
    </div>
  )
}

