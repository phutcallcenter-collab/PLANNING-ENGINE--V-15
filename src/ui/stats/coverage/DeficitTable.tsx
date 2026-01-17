'use client'

import React from 'react'
import { DailyDeficitDetail } from '@/application/stats/getCoverageRiskSummary'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Sun, Moon } from 'lucide-react'

interface Props {
  deficits: DailyDeficitDetail[]
}

export function DeficitTable({ deficits }: Props) {
  const headerCellStyle: React.CSSProperties = {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  }

  const bodyCellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '14px',
    borderTop: '1px solid #f3f4f6',
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Fecha</th>
            <th style={headerCellStyle}>Turno</th>
            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Requerido</th>
            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Presentes</th>
            <th style={{ ...headerCellStyle, textAlign: 'center', color: '#b91c1c' }}>Déficit</th>
          </tr>
        </thead>
        <tbody>
          {deficits.map(({ date, shift, required, actual, deficit }) => (
            <tr key={`${date}-${shift}`} className="deficit-row">
              <style jsx>{`
                .deficit-row:hover {
                  background-color: #fcfcfd;
                }
              `}</style>
              <td style={{ ...bodyCellStyle, fontWeight: 500, color: '#374151' }}>
                {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: es })}
              </td>
              <td style={bodyCellStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {shift === 'DAY' ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#4f46e5" />}
                  <span>{shift === 'DAY' ? 'Día' : 'Noche'}</span>
                </div>
              </td>
              <td style={{ ...bodyCellStyle, textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>
                {required}
              </td>
              <td style={{ ...bodyCellStyle, textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>
                {actual}
              </td>
              <td style={{ ...bodyCellStyle, textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>
                -{deficit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
