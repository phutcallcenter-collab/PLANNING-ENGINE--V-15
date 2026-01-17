'use client'

import React, { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  getMonthlyPointsSummary,
  PayrollRow,
} from '@/application/stats/getMonthlyPointsSummary'
import { format, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clipboard, ClipboardCheck, Download } from 'lucide-react'

const ReportHeader = ({
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
    <div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          margin: 0,
        }}
      >
        Reporte de Puntos por Incidencia
      </h2>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
        Resumen mensual de incidencias punitivas y puntos, segmentado por rol y turno.
      </p>
    </div>
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

const ReportTable = ({
  title,
  data,
  onCopy,
}: {
  title: string
  data: PayrollRow[]
  onCopy: (text: string, title: string) => void
}) => {
  const generatePointsMatrix = () => {
    const valueOrBlank = (n: number) => (n === 0 ? '' : n)
    return data
      .map(row =>
        [
          valueOrBlank(row.tardanza),
          valueOrBlank(row.ausencia),
          valueOrBlank(row.errores),
          valueOrBlank(row.otros),
        ].join('\t')
      )
      .join('\n')
  }

  const tableHeaderStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
  }
  
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderTop: '1px solid #f3f4f6',
    fontSize: '14px',
  }

  return (
    <section>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onCopy(generatePointsMatrix(), title)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 12px',
              background: '#eef2ff',
              color: '#312e81',
              border: '1px solid #c7d2fe',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Download size={14} /> Copiar Puntos (para Excel)
          </button>
        </div>
      </header>
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--bg-panel)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={tableHeaderStyle}>Empleado</th>
              <th style={{...tableHeaderStyle, textAlign: 'right'}}>Tardanza</th>
              <th style={{...tableHeaderStyle, textAlign: 'right'}}>Ausencia</th>
              <th style={{...tableHeaderStyle, textAlign: 'right'}}>Errores</th>
              <th style={{...tableHeaderStyle, textAlign: 'right'}}>Otros</th>
              <th style={{...tableHeaderStyle, textAlign: 'right'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.repId}>
                <td style={{ ...cellStyle, fontWeight: 500 }}>{row.repName}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.tardanza > 0 ? row.tardanza : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.ausencia > 0 ? row.ausencia : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.errores > 0 ? row.errores : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.otros > 0 ? row.otros : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: row.total > 0 ? '#b91c1c' : '#1f2937' }}>{row.total}</td>
              </tr>
            ))}
            {data.length === 0 && (
                <tr>
                    <td colSpan={6} style={{...cellStyle, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic'}}>
                        No hay representantes en esta categoría.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function PointsReportView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const { representatives, incidents } = useAppStore(state => ({
    representatives: state.representatives,
    incidents: state.incidents,
  }))
  const [copiedTitle, setCopiedTitle] = useState<string | false>(false)

  const monthISO = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate])
  const monthLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: es }),
    [currentDate]
  )

  const summary = useMemo(
    () => getMonthlyPointsSummary(representatives, incidents, monthISO),
    [representatives, incidents, monthISO]
  )
  
  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedTitle(title)
        setTimeout(() => setCopiedTitle(false), 2500)
    })
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
      <ReportHeader
        monthLabel={monthLabel}
        onPrev={() => setCurrentDate(m => subMonths(m, 1))}
        onNext={() => setCurrentDate(m => addMonths(m, 1))}
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <ReportTable title="Ventas - Turno Día" data={summary.salesDay} onCopy={handleCopy} />
        <ReportTable title="Ventas - Turno Noche" data={summary.salesNight} onCopy={handleCopy} />
        <ReportTable title="Servicio al Cliente - Turno Día" data={summary.serviceDay} onCopy={handleCopy} />
        <ReportTable title="Servicio al Cliente - Turno Noche" data={summary.serviceNight} onCopy={handleCopy} />
      </div>

      {/* Copy Confirmation Toast */}
      {copiedTitle && (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background: '#1f2937',
            color: 'white',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 100
        }}>
            <ClipboardCheck size={18} />
            <span>
              Matriz de puntos para "{copiedTitle}" copiada.
            </span>
        </div>
      )}
    </div>
  )
}

