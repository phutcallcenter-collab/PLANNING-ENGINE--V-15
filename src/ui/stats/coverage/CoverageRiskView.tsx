'use client'

import React, { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { format, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { StatCard } from '../overview/StatCard'
import { getCoverageRiskSummary } from '@/application/stats/getCoverageRiskSummary'
import {
  AlertTriangle,
  CalendarCheck,
  TrendingDown,
  Users,
  Sun,
  Moon,
} from 'lucide-react'
import { DeficitTable } from './DeficitTable'

const RiskHeader = ({
  monthLabel,
  onPrev,
  onNext,
}: {
  monthLabel: string
  onPrev: () => void
  onNext: () => void
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
    <h2
      style={{
        fontSize: '20px',
        fontWeight: 600,
        margin: 0,
      }}
    >
      Análisis de Riesgo y Cobertura
    </h2>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={onPrev}
        style={{
          padding: '8px',
          border: '1px solid var(--border-strong)',
          borderRadius: '6px',
          background: 'var(--bg-panel)',
          cursor: 'pointer',
        }}
      >
        &lt;
      </button>
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'capitalize',
          margin: 0,
          minWidth: '150px',
          textAlign: 'center',
        }}
      >
        {monthLabel}
      </h3>
      <button
        onClick={onNext}
        style={{
          padding: '8px',
          border: '1px solid var(--border-strong)',
          borderRadius: '6px',
          background: 'var(--bg-panel)',
          cursor: 'pointer',
        }}
      >
        &gt;
      </button>
    </div>
  </div>
)

export function CoverageRiskView() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const {
    swaps,
    coverageRules,
    allCalendarDaysForRelevantMonths,
    historyEvents,
    incidents,
  } = useAppStore(state => ({
    swaps: state.swaps,
    coverageRules: state.coverageRules,
    allCalendarDaysForRelevantMonths: state.allCalendarDaysForRelevantMonths,
    historyEvents: state.historyEvents,
    incidents: state.incidents,
  }))

  const monthISO = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate])
  const monthLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: es }),
    [currentDate]
  )

  const weeklyPlansForMonth = useMemo(() => {
    // ⚠️ Fuente temporal.
    // Esta vista depende de eventos históricos de planificación.
    // Será reemplazado por getWeeklyPlansForRange() cuando exista persistencia formal.
    return historyEvents
      .filter(
        e =>
          e.category === 'PLANNING' &&
          (e.metadata as any)?.weeklyPlan?.weekStart?.startsWith(monthISO)
      )
      .map(e => (e.metadata as any).weeklyPlan)
  }, [historyEvents, monthISO])

  const riskSummary = useMemo(() => {
    return getCoverageRiskSummary({
      monthDays: allCalendarDaysForRelevantMonths.filter(d =>
        d.date.startsWith(monthISO)
      ),
      weeklyPlans: weeklyPlansForMonth,
      swaps,
      coverageRules,
      incidents,
      representatives: useAppStore.getState().representatives,
    })
  }, [
    monthISO,
    weeklyPlansForMonth,
    swaps,
    coverageRules,
    incidents,
    allCalendarDaysForRelevantMonths,
  ])

  if (!riskSummary) {
    return <div style={{ padding: '24px' }}>Cargando resumen de riesgo...</div>
  }

  const {
    daysWithDeficit,
    criticalDeficitDays,
    totalDeficit,
    worstShift,
    dailyDeficits,
  } = riskSummary

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <RiskHeader
        monthLabel={monthLabel}
        onPrev={() => setCurrentDate(m => subMonths(m, 1))}
        onNext={() => setCurrentDate(m => addMonths(m, 1))}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
        }}
      >
        <StatCard
          label="Días con Déficit"
          value={daysWithDeficit}
          Icon={AlertTriangle}
          variant={daysWithDeficit > 0 ? 'danger' : 'neutral'}
          tooltipContent={`${daysWithDeficit} de ${riskSummary.totalDays} días tuvieron menos personal del requerido en al menos un turno.`}
        />
        <StatCard
          label="Días Críticos (>2)"
          value={criticalDeficitDays}
          Icon={TrendingDown}
          variant={criticalDeficitDays > 0 ? 'danger' : 'neutral'}
          tooltipContent={`${criticalDeficitDays} días tuvieron un déficit de más de 2 personas, representando un riesgo operativo alto.`}
        />
        <StatCard
          label="Déficit Total"
          value={totalDeficit}
          Icon={Users}
          variant={totalDeficit > 0 ? 'warning' : 'neutral'}
          tooltipContent={`Suma total de puestos no cubiertos durante todo el mes. Un déficit de 2 en un día suma 2 a este total.`}
        />
        <StatCard
          label="Turno Más Débil"
          value={
            worstShift.shift
              ? `${worstShift.shift === 'DAY' ? 'Día' : 'Noche'} (-${worstShift.deficit
              })`
              : 'N/A'
          }
          Icon={
            worstShift.shift === 'DAY'
              ? Sun
              : worstShift.shift === 'NIGHT'
                ? Moon
                : CalendarCheck
          }
          variant={worstShift.deficit > 0 ? 'warning' : 'neutral'}
          tooltipContent={`El turno ${worstShift.shift || ''
            } acumuló el mayor déficit de personal durante el mes.`}
        />
      </div>

      <div style={{ marginTop: '16px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '12px',
          }}
        >
          Desglose de Déficits del Mes
        </h3>
        {dailyDeficits.length > 0 ? (
          <DeficitTable deficits={dailyDeficits} />
        ) : (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>
              No se detectaron déficits de cobertura para el mes seleccionado.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

