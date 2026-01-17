'use client'

import React from 'react'

export type StatsTab = 'monthly' | 'points'

interface Props {
  activeTab: StatsTab
  onTabChange: (tab: StatsTab) => void
}

export function StatsTabs({ activeTab, onTabChange }: Props) {
  const tabs: { id: StatsTab; label: string }[] = [
    { id: 'monthly', label: 'Resumen Mensual' },
    { id: 'points', label: 'Reporte de Puntos' },
  ]

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

        background: 'var(--bg-panel)',
        borderRadius: '12px 12px 0 0',
        padding: '0 16px',
        border: '1px solid var(--border-subtle)',
        borderBottom: 'none',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          style={tabStyle(activeTab === tab.id)}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

