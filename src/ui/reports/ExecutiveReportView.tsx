'use client'

import { useAppStore } from '@/store/useAppStore'
import { selectExecutiveReport } from '@/store/selectors/selectExecutiveReport'

export default function ExecutiveReportView({
  from,
  to,
}: {
  from: string
  to: string
}) {
  const report = useAppStore(state =>
    selectExecutiveReport(state, from, to)
  )

  if (!report) {
    return <div>Cargando reporte...</div>
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', background: '#f9fafb' }}>
      <h1 style={{ color: 'var(--text-main)' }}>Reporte Ejecutivo</h1>
      <p style={{ color: 'var(--text-main)', borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
        Periodo: <strong>{report.period.from}</strong> → <strong>{report.period.to}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        <div>
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--text-main)' }}>Resumen Global de Incidencias</h3>
            <pre style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{JSON.stringify(report.kpis, null, 2)}</pre>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-main)' }}>Candidatos Potenciales (0-1 Incidencias Punitivas)</h3>
            <pre style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{JSON.stringify(report.candidates, null, 2)}</pre>
          </section>
        </div>

        <div>
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--text-main)' }}>Personal que Requiere Atención (2-4 Incidencias)</h3>
            <pre style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{JSON.stringify(report.needsAttention.filter(p => p.incidents >= 2 && p.incidents <= 4), null, 2)}</pre>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-main)' }}>Personal con Incidencias Recurrentes (5+ Incidencias)</h3>
            <pre style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{JSON.stringify(report.needsAttention.filter(p => p.incidents >= 5), null, 2)}</pre>
          </section>
        </div>
      </div>
    </div>
  )
}

