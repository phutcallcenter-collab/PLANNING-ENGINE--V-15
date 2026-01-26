'use client'

import React, { useMemo, useState } from 'react'
import { BarChart, TrendingDown, CalendarDays, Users, AlertTriangle, Stethoscope, Palmtree } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { format, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { getStatsOverview } from '@/application/stats/getStatsOverview'
import { WeeklyPlan } from '@/domain/types'
import { StatCard } from './StatCard'

const OverviewHeader = ({
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
      Visión General
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

export function StatsOverview() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const { incidents, representatives, swaps, calendar, coverageRules, weeklyPlans: allWeeklyPlans, allCalendarDaysForRelevantMonths, specialSchedules } = useAppStore(state => ({
    incidents: state.incidents,
    representatives: state.representatives,
    swaps: state.swaps,
    calendar: state.calendar,
    coverageRules: state.coverageRules,
    weeklyPlans: state.historyEvents.filter(e => e.category === 'PLANNING').map(e => e.metadata?.weeklyPlan), // This needs a proper source
    allCalendarDaysForRelevantMonths: state.allCalendarDaysForRelevantMonths,
    specialSchedules: state.specialSchedules,
  }))

  const monthISO = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate])
  const monthLabel = useMemo(() => format(currentDate, 'MMMM yyyy', { locale: es }), [currentDate])

  // TEMPORARY & HONEST LIMITATION:
  // StatsOverview currently aggregates from available weekly plans in the store.
  // A robust solution requires a historical `getWeeklyPlansForRange` from a persisted source.
  // This component will NOT reconstruct or infer plans.
  const weeklyPlansForMonth = useMemo(() => {
    // This is a placeholder for a real historical query
    return allWeeklyPlans.filter(p => p?.weekStart?.startsWith(monthISO)) as WeeklyPlan[]
  }, [allWeeklyPlans, monthISO]);


  const stats = useMemo(() => {
    return getStatsOverview({
      month: monthISO,
      incidents,
      representatives,
      swaps,
      weeklyPlans: weeklyPlansForMonth,
      monthDays: allCalendarDaysForRelevantMonths.filter(d => d.date.startsWith(monthISO)),
      coverageRules,
      specialSchedules
    });
  }, [monthISO, incidents, representatives, swaps, weeklyPlansForMonth, allCalendarDaysForRelevantMonths, coverageRules, specialSchedules]);


  if (!stats) {
    return <div style={{ padding: '24px' }}>Cargando datos de visión general...</div>
  }

  const tooltips = {
    totalIncidents: "Suma de todas las incidencias registradas, excluyendo Licencias y Vacaciones.",
    peopleAtRisk: (
      <div style={{ maxWidth: '250px', lineHeight: 1.4 }}>
        Cantidad de personas que superaron los límites definidos:
        <ul style={{ paddingLeft: '20px', margin: '4px 0 0' }}>
          <li>≥ 3 tardanzas</li>
          <li>≥ 2 errores</li>
          <li>≥ 2 ausencias</li>
          <li>o ≥ 10 puntos acumulados</li>
        </ul>
      </div>
    ),
    deficitDays: "Número de días del mes en los que hubo un déficit de cobertura en al menos un turno.",
    totalSwaps: "Cantidad total de cambios de turno (Covers, Swaps, Doubles) realizados en el mes.",
    licenses: "Cantidad de eventos de licencia médica/especial iniciados este mes.",
    vacations: "Cantidad de periodos de vacaciones iniciados este mes."
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <OverviewHeader
        monthLabel={monthLabel}
        onPrev={() => setCurrentDate(m => subMonths(m, 1))}
        onNext={() => setCurrentDate(m => addMonths(m, 1))}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
        }}
      >
        <StatCard
          label="Total Incidencias"
          value={stats.totalIncidents}
          Icon={BarChart}
          variant={stats.totalIncidents > 0 ? 'warning' : 'neutral'}
          tooltipContent={tooltips.totalIncidents}
        />
        <StatCard
          label="Personas en Riesgo"
          value={stats.peopleAtRisk}
          Icon={Users}
          variant={stats.peopleAtRisk > 0 ? 'danger' : 'neutral'}
          tooltipContent={tooltips.peopleAtRisk}
        />
        <StatCard
          label="Días con Déficit"
          value={stats.deficitDays}
          Icon={AlertTriangle}
          variant={stats.deficitDays > 0 ? 'danger' : 'neutral'}
          tooltipContent={tooltips.deficitDays}
        />
        <StatCard
          label="Cambios de Turno"
          value={stats.totalSwaps}
          Icon={CalendarDays}
          variant='neutral'
          tooltipContent={tooltips.totalSwaps}
        />
        <StatCard
          label="Licencias"
          value={stats.licenseEvents}
          Icon={Stethoscope}
          variant='neutral'
          tooltipContent={tooltips.licenses}
        />
        <StatCard
          label="Vacaciones"
          value={stats.vacationsEvents}
          Icon={Palmtree} // Ensure Palmtree is imported or fallback to Sun
          variant='neutral'
          tooltipContent={tooltips.vacations}
        />
      </div>
      <div
        style={{
          marginTop: '16px',
          padding: '24px',
          textAlign: 'center',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          color: '#4b5563',
        }}
      >
        <h3 style={{ marginTop: 0, fontWeight: 600 }}>Más estadísticas próximamente</h3>
        <p style={{ margin: 0, fontSize: '14px' }}>Las vistas de Carga de Trabajo y Reportes detallados están en desarrollo.</p>
      </div>
    </div>
  )
}

