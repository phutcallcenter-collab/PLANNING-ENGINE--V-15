'use client'

import React, { useState } from 'react'
import { StatsTabs, type StatsTab } from './StatsTabs'
import { MonthlySummaryView } from './monthly/MonthlySummaryView'
import { PointsReportView } from './reports/PointsReportView'
import { OperationalReportView } from './reports/OperationalReportView'

export type ExtendedStatsTab = StatsTab | 'points' | 'executive'

export function StatsView() {
  const [activeTab, setActiveTab] = useState<ExtendedStatsTab>('monthly')

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: isActive
      ? '2px solid hsl(0, 0%, 13%)'
      : '2px solid transparent',
    color: isActive ? '#111827' : '#4b5563',
    fontWeight: isActive ? 600 : 500,
    background: 'transparent',
    fontSize: '15px',
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{

          background: 'var(--bg-panel)',
          borderRadius: '12px 12px 0 0',
          padding: '0 16px',
          border: '1px solid var(--border-subtle)',
          borderBottom: 'none',
        }}
      >
        <button
          style={tabStyle(activeTab === 'monthly')}
          onClick={() => setActiveTab('monthly')}
        >
          Resumen Mensual
        </button>
        <button
          style={tabStyle(activeTab === 'points')}
          onClick={() => setActiveTab('points')}
        >
          Reporte de Puntos
        </button>
        <button
          style={tabStyle(activeTab === 'executive')}
          onClick={() => setActiveTab('executive')}
        >
          Reporte Operativo
        </button>
      </div>

      <div
        style={{
          background: 'var(--bg-panel)',
          borderRadius: '0 0 12px 12px',
          border: '1px solid var(--border-subtle)',
          borderTop: 'none',
          minHeight: '80vh',
        }}
      >
        {activeTab === 'monthly' && <MonthlySummaryView />}
        {activeTab === 'points' && <PointsReportView />}
        {activeTab === 'executive' && <OperationalReportView />}
      </div>
    </div>
  )
}

