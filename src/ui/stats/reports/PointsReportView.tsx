'use client'

import { useAccess } from '@/hooks/useAccess'
import { ReportExportActions } from '@/ui/components/ReportExportActions'
import { Tooltip } from '@/ui/components/Tooltip'
import { exportPointsReport } from './exportPointsReport'
import { ReorderAgentsModal } from './components/ReorderAgentsModal'
import { PointsReportActions } from './PointsReportActions'
import { PointsReportCopyToast } from './PointsReportCopyToast'
import { PointsReportTable } from './PointsReportTable'
import { usePointsReportView } from './usePointsReportView'
import { useState } from 'react'
import { Info } from 'lucide-react'

interface PointsReportViewProps {
  currentDate: Date
}

export function PointsReportView({ currentDate }: PointsReportViewProps) {
  const { canEditData } = useAccess()
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const {
    copiedTitle,
    monthLabel,
    reorderModal,
    summary,
    closeReorderModal,
    handleCopy,
    openReorderModal,
  } = usePointsReportView(currentDate)

  return (
    <div
      className="report-print-root"
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
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
            Incidencias del mes
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
              Puntos por turno
            </h2>
            <Tooltip
              content={`Vista mensual compacta de ${monthLabel} para copiar, revisar y reordenar sin navegar dentro del panel.`}
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
                aria-label="Contexto del reporte de puntos"
              >
                <Info size={13} aria-hidden="true" />
              </span>
            </Tooltip>
          </div>
        </div>
        <ReportExportActions
          isExportingPdf={isExportingPdf}
          onExportPdf={async () => {
            setIsExportingPdf(true)

            try {
              await exportPointsReport({ monthLabel, summary })
            } finally {
              setIsExportingPdf(false)
            }
          }}
          onPrint={() => window.print()}
          pdfLabel="Descargar PDF"
          printLabel="Imprimir"
        />
      </div>

      <PointsReportActions
        canEditData={canEditData}
        onOpenReorderModal={openReorderModal}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <PointsReportTable
          title="Incidencias y puntos - Turno Día"
          data={summary.salesDay}
          onCopy={handleCopy}
        />
        <PointsReportTable
          title="Incidencias y puntos - Turno Noche"
          data={summary.salesNight}
          onCopy={handleCopy}
        />
        <PointsReportTable
          title="Servicio al Cliente - Turno Día"
          data={summary.serviceDay}
          onCopy={handleCopy}
        />
        <PointsReportTable
          title="Servicio al Cliente - Turno Noche"
          data={summary.serviceNight}
          onCopy={handleCopy}
        />
      </div>

      {reorderModal.isOpen && (
        <ReorderAgentsModal
          shift={reorderModal.shift}
          isOpen={reorderModal.isOpen}
          onClose={closeReorderModal}
        />
      )}

      {copiedTitle ? (
        <div className="report-screen-only">
          <PointsReportCopyToast copiedTitle={copiedTitle} />
        </div>
      ) : null}
    </div>
  )
}
