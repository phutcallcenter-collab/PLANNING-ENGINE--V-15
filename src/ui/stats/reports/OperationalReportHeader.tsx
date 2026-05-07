'use client'

import type { PeriodKind } from '@/domain/reports/operationalTypes'
import { ReportExportActions } from '@/ui/components/ReportExportActions'

const PERIOD_OPTIONS: Array<{ label: string; value: PeriodKind }> = [
  { label: 'Mes actual', value: 'MONTH' },
  { label: 'Trimestre actual', value: 'QUARTER' },
]

interface OperationalReportHeaderProps {
  currentPeriodLabel: string
  isExporting?: boolean
  onExport: () => void | Promise<void>
  onPrint: () => void
  onPeriodChange: (kind: PeriodKind) => void
}

export function OperationalReportHeader({
  currentPeriodLabel,
  isExporting = false,
  onExport,
  onPrint,
  onPeriodChange,
}: OperationalReportHeaderProps) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: '18px',
        border: '1px solid var(--shell-border)',
        background:
          'linear-gradient(135deg, var(--surface-raised) 0%, var(--surface-tint) 60%, rgba(var(--accent-rgb), 0.06) 100%)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '5px',
            }}
          >
            Reporte operativo
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-main)', letterSpacing: 0 }}>
            Resumen del equipo
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Vista general de <strong>{currentPeriodLabel}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <ReportExportActions
            isExportingPdf={isExporting}
            onExportPdf={onExport}
            onPrint={onPrint}
            pdfLabel="Descargar PDF"
            printLabel="Imprimir"
          />
          <select
            className="report-screen-only"
            onChange={event => onPeriodChange(event.target.value as PeriodKind)}
            defaultValue="MONTH"
            style={{
              padding: '10px 12px',
              border: '1px solid var(--shell-border)',
              borderRadius: '16px',
              background: 'linear-gradient(180deg, var(--surface-raised) 0%, var(--surface-veil) 100%)',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--text-main)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {PERIOD_OPTIONS.map(option => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
