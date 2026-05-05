'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { selectOperationalReport } from '@/store/selectors/selectOperationalReport'
import OperationalAnalysisView from './OperationalAnalysisView'
import { OperationalCompetitivePanel } from './OperationalCompetitivePanel'
import { OperationalInstitutionalView } from './OperationalInstitutionalView'
import { OperationalReportModeToggle } from './OperationalReportModeToggle'

// ============================================================================
// MAIN VIEW
// ============================================================================

interface OperationalReportViewProps {
  onOpenCallCenter: () => void
}

export function OperationalReportView({ onOpenCallCenter }: OperationalReportViewProps) {
  const [mode, setMode] = useState<'SUMMARY' | 'ANALYSIS'>('SUMMARY')
  const [periodKind, setPeriodKind] = useState<'MONTH' | 'QUARTER'>('MONTH')

  const report = useAppStore(state => selectOperationalReport(state, periodKind))

  return (
    <div
      className="report-print-root"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 100%)',
      }}
    >
      <div className="report-screen-only">
        <OperationalReportModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === 'SUMMARY' ? (
        report ? (
          <>
            <OperationalCompetitivePanel onOpenCallCenter={onOpenCallCenter} />
            <OperationalInstitutionalView
              report={report}
              onPeriodChange={setPeriodKind}
            />
          </>
        ) : (
          <div className="app-shell-loading" style={{ margin: '24px 0' }}>
            Cargando reporte...
          </div>
        )
      ) : (
        <OperationalAnalysisView />
      )}
    </div>
  )
}
