'use client'

import React, { useState, useMemo } from 'react'
import { useMonthlySummary } from '@/domain/analytics/useMonthlySummary'
import type {
  PersonMonthlySummary,
  RiskLevel,
} from '@/domain/analytics/types'
import { format, subMonths, addMonths, parseISO, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppStore } from '@/store/useAppStore'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { Bar } from 'react-chartjs-2'
import { Plane, FileText, AlertTriangle } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
)

const MonthlyHeader = ({
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
      Resumen Mensual de Incidencias
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

const InfoCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: number
  color: string
}) => (
  <div
    style={{
      padding: '16px',
      background: 'var(--bg-panel)',
      borderRadius: '8px',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={18} style={{ color }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>
      {value}
    </div>
  </div>
)

const MonthlyChart = ({
  summary,
}: {
  summary: ReturnType<typeof useMonthlySummary>
}) => {
  const chartData = useMemo(() => {
    if (!summary) {
      return null
    }

    const allIncidents = summary.byPerson.flatMap(p => p.incidents)

    const [year, month] = summary.month.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const data = new Array(daysInMonth).fill(0);

    for (const incident of allIncidents) {
      if (!incident.startDate) continue
      try {
        const dayOfMonth = parseISO(incident.startDate).getDate()
        if (dayOfMonth > 0 && dayOfMonth <= daysInMonth) {
          data[dayOfMonth - 1] += 1
        }
      } catch (e) {
        console.error("Invalid date for incident", incident);
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'Incidencias por Día',
          data,
          backgroundColor: data.map(d =>
            d >= 3
              ? 'hsl(0, 70%, 60%)'
              : d > 0
                ? 'hsl(40, 80%, 60%)'
                : 'hsl(210, 30%, 85%)'
          ),
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    }
  }, [summary])

  if (!chartData) {
    return (
      <div
        style={{
          height: '240px',
          background: '#f9fafb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Cargando datos del gráfico...
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        height: '100%',
      }}
    >
      <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Incidencias por Día</h3>
      <div style={{ height: '220px' }}>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return `Incidencias: ${context.parsed.y}`
                  },
                },
              },
            },
            scales: {
              x: { grid: { display: false } },
              y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { stepSize: 1 },
              },
            },
          }}
        />
      </div>
    </div>
  )
}

const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const colors: Record<RiskLevel, string> = {
    danger: '#ef4444', // red-500
    warning: '#f59e0b', // amber-500
    ok: '#10b981',      // emerald-500
  }

  return (
    <div
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: colors[level],
        margin: '0 auto', // Centrado
      }}
      title={level === 'danger' ? 'Riesgo' : level === 'warning' ? 'Atención' : 'OK'} // Tooltip nativo
    />
  )
}

const MonthlyTable = ({
  data,
  onSelectRow,
}: {
  data: PersonMonthlySummary[]
  onSelectRow: (person: PersonMonthlySummary) => void
}) => {
  const headerStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    opacity: 0.7,
  }
  const cellStyle: React.CSSProperties = {
    padding: '12px',
    borderTop: '1px solid #f3f4f6',
    fontSize: '14px',
  }

  const sortedData = [...data].sort((a, b) => b.totals.puntos - a.totals.puntos)

  return (
    <div
      style={{
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        background: 'var(--bg-panel)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f9fafb' }}>
          <tr>
            <th style={headerStyle}>Representante</th>
            <th style={{ ...headerStyle, textAlign: 'center' }}>Puntos</th>
            <th style={{ ...headerStyle, textAlign: 'center' }}>Ausencias</th>
            <th style={{ ...headerStyle, textAlign: 'center' }}>Tardanzas</th>
            <th style={{ ...headerStyle, textAlign: 'center' }}>Errores</th>
            <th style={{ ...headerStyle, textAlign: 'center' }}>Estado</th>
            <th style={{ ...headerStyle, textAlign: 'center' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map(person => (
            <tr
              key={person.representativeId}
              style={{
                background:
                  person.riskLevel === 'danger'
                    ? 'hsl(0,100%,98%)'
                    : person.riskLevel === 'warning'
                      ? 'hsl(45,100%,98%)'
                      : 'white',
              }}
              className="hover-row"
            >
              <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--text-main)' }}>
                {person.name}
              </td>
              <td
                style={{
                  ...cellStyle,
                  fontWeight: 700,
                  color: person.totals.puntos > 0 ? '#b91c1c' : '#374151',
                  textAlign: 'center',
                }}
              >
                {person.totals.puntos}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                {person.totals.ausencias}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                {person.totals.tardanzas}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                {person.totals.errores}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                <RiskBadge level={person.riskLevel} />
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                <button
                  onClick={() => onSelectRow(person)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MonthlySummaryView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const openDetailModal = useAppStore(s => s.openDetailModal)
  const { incidents, representatives, allCalendarDaysForRelevantMonths } = useAppStore(s => ({
    incidents: s.incidents,
    representatives: s.representatives,
    allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
  }))

  const monthISO = useMemo(
    () => format(currentDate, 'yyyy-MM'),
    [currentDate]
  )

  const monthLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: es }),
    [currentDate]
  )

  const summary = useMonthlySummary(monthISO)

  // Filtrar representantes por búsqueda
  const filteredSummary = useMemo(() => {
    if (!summary || !searchTerm.trim()) return summary

    return {
      ...summary,
      byPerson: summary.byPerson.filter(person =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  }, [summary, searchTerm])

  // Calcular métricas de vacaciones, licencias y personas en riesgo
  const metrics = useMemo(() => {
    if (!summary) return { onVacation: 0, onLicense: 0, atRisk: 0 }

    const today = format(new Date(), 'yyyy-MM-dd')

    // Personas actualmente de vacaciones (vacaciones activas que incluyen el día de hoy)
    const vacationIncidents = incidents.filter(i => i.type === 'VACACIONES')
    const onVacationSet = new Set<string>()

    vacationIncidents.forEach(incident => {
      const rep = representatives.find(r => r.id === incident.representativeId)
      if (!rep) return

      const resolved = resolveIncidentDates(incident, allCalendarDaysForRelevantMonths, rep)
      if (resolved.dates.includes(today)) {
        onVacationSet.add(incident.representativeId)
      }
    })

    // Personas actualmente de licencia (licencias activas que incluyen el día de hoy)
    const licenseIncidents = incidents.filter(i => i.type === 'LICENCIA')
    const onLicenseSet = new Set<string>()

    licenseIncidents.forEach(incident => {
      const rep = representatives.find(r => r.id === incident.representativeId)
      if (!rep) return

      const resolved = resolveIncidentDates(incident, allCalendarDaysForRelevantMonths, rep)
      if (resolved.dates.includes(today)) {
        onLicenseSet.add(incident.representativeId)
      }
    })

    // Personas en riesgo (≥10 puntos en el mes)
    const atRisk = summary.byPerson.filter(p => p.totals.puntos >= 10).length

    return {
      onVacation: onVacationSet.size,
      onLicense: onLicenseSet.size,
      atRisk,
    }
  }, [summary, incidents, representatives, allCalendarDaysForRelevantMonths])

  const handleSelectPerson = (personData: PersonMonthlySummary) => {
    openDetailModal(personData.representativeId, monthISO);
  }

  if (!summary) {
    return (
      <div style={{ padding: '40px' }}>
        Cargando resumen mensual...
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
      }}
    >
      <style jsx global>{`
        .hover-row:hover {
          background-color: #f9fafb !important;
        }
      `}</style>
      <MonthlyHeader
        monthLabel={monthLabel}
        onPrev={() => setCurrentDate(m => subMonths(m, 1))}
        onNext={() => setCurrentDate(m => addMonths(m, 1))}
      />


      {/* KPIs - Conclusión */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        <InfoCard
          icon={Plane}
          label="De Vacaciones"
          value={metrics.onVacation}
          color="#2563eb"
        />
        <InfoCard
          icon={FileText}
          label="De Licencia"
          value={metrics.onLicense}
          color="#7c3aed"
        />
        <InfoCard
          icon={AlertTriangle}
          label="Agentes con ≥10 pts"
          value={metrics.atRisk}
          color="#dc2626"
        />
      </div>

      {/* Gráfica - Evidencia */}
      <div
        style={{
          marginBottom: '32px',
          paddingBottom: '16px',
          borderBottom: '1px dashed #e5e7eb',
        }}
      >
        <MonthlyChart summary={summary} />
      </div>

      {/* Buscador de Representantes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
          Buscar Representante
        </label>
        <input
          type="text"
          placeholder="Escribe el nombre del representante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
        {searchTerm && filteredSummary && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Mostrando {filteredSummary.byPerson.length} de {summary?.byPerson.length || 0} representantes
          </div>
        )}
      </div>

      {/* Tabla de Detalle */}
      <div style={{ marginTop: '16px' }}>
        <MonthlyTable
          data={filteredSummary?.byPerson || []}
          onSelectRow={handleSelectPerson}
        />
      </div>
    </div>
  )
}

