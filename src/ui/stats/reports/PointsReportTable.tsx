import { Download, Info } from 'lucide-react'
import type { PayrollRow } from '@/application/stats/getMonthlyPointsSummary'
import type { CSSProperties } from 'react'
import { UI_GLOSSARY } from '@/ui/copy/glossary'
import { Tooltip } from '@/ui/components/Tooltip'

interface PointsReportTableProps {
  data: PayrollRow[]
  title: string
  onCopy: (text: string, title: string) => void
}

const tableHeaderStyle: CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--shell-border)',
  background: 'rgba(244, 238, 228, 0.7)',
}

const cellStyle: CSSProperties = {
  padding: '12px 14px',
  borderTop: '1px solid rgba(202, 189, 168, 0.38)',
  fontSize: '14px',
  color: 'var(--text-main)',
}

function generatePointsMatrix(data: PayrollRow[]): string {
  const valueOrBlank = (value: number) => (value === 0 ? '' : value)

  return data
    .map(row =>
      [
        valueOrBlank(row.tardanza),
        valueOrBlank(row.ausencia),
        valueOrBlank(row.errores),
        valueOrBlank(row.otros),
        valueOrBlank(row.total),
      ].join('\t')
    )
    .join('\n')
}

export function PointsReportTable({
  data,
  title,
  onCopy,
}: PointsReportTableProps) {
  const totals = data.reduce(
    (acc, row) => ({
      tardanza: acc.tardanza + row.tardanza,
      ausencia: acc.ausencia + row.ausencia,
      errores: acc.errores + row.errores,
      otros: acc.otros + row.otros,
      total: acc.total + row.total,
    }),
    {
      tardanza: 0,
      ausencia: 0,
      errores: 0,
      otros: 0,
      total: 0,
    }
  )

  return (
    <section
      style={{
        border: '1px solid var(--shell-border)',
        borderRadius: '22px',
        background:
          'linear-gradient(180deg, var(--surface-raised) 0%, rgba(255,255,255,0.42) 100%)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '20px',
          gap: '16px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--shell-border)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(248,242,233,0.72) 100%)',
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
            Tabla exportable
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 700,
                margin: 0,
                color: 'var(--text-main)',
                letterSpacing: 0,
              }}
            >
              {title}
            </h3>
            <Tooltip content="Matriz lista para revisar y copiar rapidamente a Excel.">
              <span
                className="report-screen-only"
                tabIndex={0}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '999px',
                  display: 'inline-grid',
                  placeItems: 'center',
                  color: 'var(--text-muted)',
                  background: 'rgba(var(--accent-rgb),0.08)',
                  border: '1px solid rgba(var(--accent-rgb),0.14)',
                }}
                aria-label="Contexto de tabla exportable"
              >
                <Info size={12} aria-hidden="true" />
              </span>
            </Tooltip>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '999px',
              background: 'linear-gradient(180deg, var(--surface-raised) 0%, var(--surface-veil) 100%)',
              border: '1px solid var(--shell-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {UI_GLOSSARY.representative.plural}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              {data.length}
            </span>
          </div>
          <button
            className="report-screen-only"
            onClick={() => onCopy(generatePointsMatrix(data), title)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '10px 14px',
              background: 'rgba(var(--accent-rgb), 0.08)',
              color: 'var(--accent)',
              border: '1px solid rgba(var(--accent-rgb), 0.16)',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Download size={14} /> Copiar Matriz (para Excel)
          </button>
        </div>
      </header>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>{UI_GLOSSARY.representative.singular}</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                Tardanza
              </th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                Ausencia
              </th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                Errores
              </th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Otros</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.repId}>
                <td style={{ ...cellStyle, fontWeight: 500 }}>{row.repName}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {row.tardanza > 0 ? row.tardanza : ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {row.ausencia > 0 ? row.ausencia : ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {row.errores > 0 ? row.errores : ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  {row.otros > 0 ? row.otros : ''}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: 'right',
                    fontWeight: 700,
                    color: row.total > 0 ? '#b91c1c' : '#1f2937',
                  }}
                >
                  {row.total}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    ...cellStyle,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  No hay representantes en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr
                style={{
                  background: 'rgba(244, 238, 228, 0.7)',
                  borderTop: '1px solid var(--shell-border)',
                }}
              >
                <td
                  style={{
                    ...cellStyle,
                    fontWeight: 700,
                    borderTop: 'none',
                  }}
                >
                  Total del bloque
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', borderTop: 'none', fontWeight: 700 }}>
                  {totals.tardanza || ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', borderTop: 'none', fontWeight: 700 }}>
                  {totals.ausencia || ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', borderTop: 'none', fontWeight: 700 }}>
                  {totals.errores || ''}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', borderTop: 'none', fontWeight: 700 }}>
                  {totals.otros || ''}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: 'right',
                    borderTop: 'none',
                    fontWeight: 800,
                    color:
                      totals.total > 0 ? 'var(--text-danger)' : 'var(--text-main)',
                  }}
                >
                  {totals.total}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}
