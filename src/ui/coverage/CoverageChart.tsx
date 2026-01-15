'use client'

import React from 'react'
import type { ISODate } from '@/domain/types'
import { EffectiveCoverageResult } from '@/application/ui-adapters/getEffectiveDailyCoverage'

// Mock Tooltip component for demonstration
const Tooltip = ({
  content,
  children,
}: {
  content: React.ReactNode
  children: React.ReactNode
}) => {
  const [show, setShow] = React.useState(false)
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        width: '100%',
        height: '100%',
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            marginBottom: '8px',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

interface CoverageChartProps {
  data: Record<ISODate, EffectiveCoverageResult>
}

export function CoverageChart({
  data
}: CoverageChartProps) {
  const dates = Object.keys(data).sort()

  const maxCoverage = Math.max(
    1,
    ...Object.values(data).map(d => Math.max(d.actual, d.required))
  )

  return (
    <div
      style={{
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        position: 'relative',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#111827' }}>
        Análisis de Cobertura Diaria
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          height: '250px',
          borderLeft: '1px solid #d1d5db',
          borderBottom: '1px solid #d1d5db',
          paddingLeft: '10px',
          position: 'relative',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {dates.map(date => {
          const { actual, required, status, reason } = data[date]

          const barHeight = maxCoverage > 0 ? (actual / maxCoverage) * 100 : 0
          const isDeficit = status === 'DEFICIT'

          const barColor = isDeficit
            ? 'hsl(350, 80%, 60%)'
            : 'hsl(142.1, 76.2%, 40%)'

          const countColor = isDeficit ? 'hsl(350, 80%, 50%)' : '#111827'

          const dateObj = new Date(date + 'T12:00:00Z')
          const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' })
          const formattedDate = dateObj.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long'
          })

          const tooltipContent = (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6, textTransform: 'capitalize' }}>
                {dayName}, {formattedDate}
              </div>
              <div style={{ fontWeight: 600 }}>
                Presentes: {actual} | Requerido: {required}
              </div>
              {reason && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: '#cbd5e1',
                    maxWidth: 200,
                  }}
                >
                  {reason}
                </div>
              )}
            </div>
          )

          return (
            <div
              key={date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                height: '100%',
              }}
            >
              <div
                style={{
                  fontWeight: '600',
                  color: countColor,
                  transition: 'color 0.3s ease-in-out',
                }}
              >
                {actual}
              </div>
              <Tooltip content={tooltipContent}>
                <div
                  style={{
                    width: '80%',
                    height: `${barHeight}%`,
                    minHeight: '4px',
                    backgroundColor: barColor,
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'help',
                  }}
                />
              </Tooltip>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '60px',
                  textAlign: 'center',
                }}
              >
                {new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          )
        })}

        {/* Dynamic minimum coverage line */}
        <svg
          style={{
            position: 'absolute',
            bottom: '34px',
            left: '10px',
            width: 'calc(100% - 10px)',
            height: 'calc(100% - 34px)',
            pointerEvents: 'none',
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={dates
              .map((date, i) => {
                const req = data[date]?.required ?? 0
                const y = 100 - (maxCoverage > 0 ? (req / maxCoverage) * 100 : 0)
                const x = (i + 0.5) * (100 / dates.length)
                return `${x},${y}`
              })
              .join(' ')}
            stroke="#9ca3af"
            strokeWidth="0.5"
            fill="none"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  )
}
