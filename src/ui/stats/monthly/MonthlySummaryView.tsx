'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ReportExportActions } from '@/ui/components/ReportExportActions'
import { Tooltip } from '@/ui/components/Tooltip'
import type { PersonMonthlySummary } from '@/domain/analytics/types'
import { useMonthlySummary } from '@/domain/analytics/useMonthlySummary'
import { useAppStore } from '@/store/useAppStore'
import { MonthlySummaryChart } from './MonthlySummaryChart'
import { MonthlySummaryMetricsPanel } from './MonthlySummaryMetricsPanel'
import { MonthlySummarySearch } from './MonthlySummarySearch'
import { MonthlySummaryTable } from './MonthlySummaryTable'
import { exportMonthlySummaryReport } from './exportMonthlySummaryReport'
import {
  computeMonthlySummaryMetrics,
  filterMonthlySummaryBySearch,
} from './monthlySummaryMetrics'
import { Info } from 'lucide-react'

interface MonthlySummaryViewProps {
  currentDate: Date
}

export function MonthlySummaryView({ currentDate }: MonthlySummaryViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const openDetailModal = useAppStore(state => state.openDetailModal)
  const { incidents, representatives, allCalendarDaysForRelevantMonths } =
    useAppStore(state => ({
      incidents: state.incidents,
      representatives: state.representatives,
      allCalendarDaysForRelevantMonths: state.allCalendarDaysForRelevantMonths,
    }))

  const monthISO = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate])
  const monthLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: es }),
    [currentDate]
  )

  const summary = useMonthlySummary(monthISO)

  const filteredSummary = useMemo(
    () => filterMonthlySummaryBySearch(summary, searchTerm),
    [summary, searchTerm]
  )

  const metrics = useMemo(
    () =>
      computeMonthlySummaryMetrics(
        summary,
        incidents,
        representatives,
        allCalendarDaysForRelevantMonths
      ),
    [summary, incidents, representatives, allCalendarDaysForRelevantMonths]
  )

  const handleSelectPerson = (personData: PersonMonthlySummary) => {
    openDetailModal(personData.representativeId, monthISO)
  }

  if (!summary) {
    return (
      <div className="app-shell-loading" style={{ margin: '24px' }}>
        Cargando resumen mensual...
      </div>
    )
  }

  return (
    <div
      className="report-print-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '8px',
            }}
          >
            Resumen mensual
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.08rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: 0,
              }}
            >
              Incidencias del mes
            </h2>
            <Tooltip
              content={`Lectura rapida de ${monthLabel} con foco en volumen, picos y personas a revisar.`}
            >
              <span
                tabIndex={0}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '999px',
                  display: 'inline-grid',
                  placeItems: 'center',
                  color: 'var(--text-muted)',
                  background: 'rgba(var(--accent-rgb),0.08)',
                  border: '1px solid rgba(var(--accent-rgb),0.14)',
                }}
                aria-label="Contexto del resumen mensual"
              >
                <Info size={13} aria-hidden="true" />
              </span>
            </Tooltip>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '14px',
              border: '1px solid rgba(var(--accent-rgb), 0.16)',
              background: 'rgba(var(--accent-rgb), 0.08)',
              color: 'var(--accent-strong)',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            {summary.totals.totalIncidents} incidencias registradas
          </div>
          <ReportExportActions
            isExportingPdf={isExportingPdf}
            onExportPdf={async () => {
              setIsExportingPdf(true)

              try {
                await exportMonthlySummaryReport({
                  monthLabel,
                  metrics,
                  data: filteredSummary?.byPerson ?? [],
                })
              } finally {
                setIsExportingPdf(false)
              }
            }}
            onPrint={() => window.print()}
            pdfLabel="Descargar PDF"
            printLabel="Imprimir"
          />
        </div>
      </div>

      <MonthlySummaryMetricsPanel metrics={metrics} />

      <div className="report-screen-only">
        <MonthlySummaryChart summary={summary} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="report-screen-only">
          <MonthlySummarySearch
            searchTerm={searchTerm}
            totalCount={summary.byPerson.length}
            filteredCount={filteredSummary?.byPerson.length ?? 0}
            onSearchTermChange={setSearchTerm}
          />
        </div>
        <MonthlySummaryTable
          data={filteredSummary?.byPerson ?? []}
          onSelectRow={handleSelectPerson}
        />
      </div>
    </div>
  )
}
