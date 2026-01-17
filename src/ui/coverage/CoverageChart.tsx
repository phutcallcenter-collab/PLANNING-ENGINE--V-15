'use client'

import React from 'react'
import type { ISODate } from '@/domain/types'
import { EffectiveCoverageResult } from '@/application/ui-adapters/getEffectiveDailyCoverage'

import { createPortal } from 'react-dom'

// Portal-based Tooltip for robust overflow handling
const Tooltip = ({
  content,
  children,
}: {
  content: React.ReactNode
  children: React.ReactNode
}) => {
  const [show, setShow] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top - 8, // Gap above trigger
        left: rect.left + rect.width / 2,
      })
      setShow(true)
    }
  }

  const handleMouseLeave = () => {
    setShow(false)
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translate(-50%, calc(-100% - 8px))',
            background: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            maxWidth: '240px',
            width: 'max-content',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
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
          // Important: Allow portal to render outside but keep container clean
          overflow: 'visible',
        }}
      >
        {dates.map(date => {
          const { actual, required, status, reason } = data[date]

          const barHeight = maxCoverage > 0 ? (actual / maxCoverage) * 100 : 0
          const isDeficit = status === 'DEFICIT'
          const delta = actual - required
          const deltaSign = delta >= 0 ? '+' : ''

          const barColor = isDeficit
            ? 'hsl(350, 80%, 60%)'
            : 'hsl(142.1, 76.2%, 40%)'

          const countColor = isDeficit ? 'hsl(350, 80%, 50%)' : '#111827'

          const tooltipContent = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                {isDeficit ? '🔴' : '🟢'} {isDeficit ? 'Déficit de cobertura' : 'Cobertura OK'} ({deltaSign}{delta})
              </div>
              <div>👥 En turno: {actual}</div>
              <div>🎯 Mínimo requerido: {required}</div>
              <div>📏 Criterio: {reason || 'N/A'}</div>
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
            inset: 0,
            pointerEvents: 'none',
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={dates
              .map((date, i) => {
                const req = data[date]?.required ?? 0
                // Match bar coordinate system: 0% is bottom, 100% is top
                // SVG Y=0 is top, Y=100 is bottom.
                // So "height % from bottom" corresponds to "100 - height%" in SVG Y
                const y = (1 - (maxCoverage > 0 ? req / maxCoverage : 0)) * 100
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
