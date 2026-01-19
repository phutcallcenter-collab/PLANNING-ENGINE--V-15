'use client'

import React, { useState, useMemo } from 'react'
import { useAppStore, HistoryEvent } from '@/store/useAppStore'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const categoryStyles: Record<
  HistoryEvent['category'],
  { bg: string; text: string }
> = {
  INCIDENT: { bg: '#fee2e2', text: '#991b1b' },
  RULE: { bg: '#dbeafe', text: '#1e40af' },
  CALENDAR: { bg: '#fef3c7', text: '#92400e' },
  PLANNING: { bg: '#e0e7ff', text: '#312e81' },
  SYSTEM: { bg: '#f3f4f6', text: '#4b5563' },
  SETTINGS: { bg: '#f3f4f6', text: '#374151' },
}

const HistoryEventCard = ({ event }: { event: HistoryEvent }) => {
  const categoryStyle = categoryStyles[event.category] || categoryStyles.SYSTEM

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {format(parseISO(event.timestamp), "dd/MM/yy' 'HH:mm:ss", {
            locale: es,
          })}
        </div>
        {event.impact && (
          <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: 700 }}>
            {event.impact}
          </div>
        )}
      </div>

      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{event.title}</div>

      {event.subject && (
        <div style={{ fontWeight: 500, color: '#4b5563' }}>
          {event.subject}
        </div>
      )}

      {event.description && (
        <div
          style={{
            fontSize: '14px',
            color: '#374151',
            fontStyle: 'normal',
            paddingTop: '4px',
          }}
        >
          {event.description}
        </div>
      )}

      <div style={{ paddingTop: '8px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '99px',
            fontSize: '10px',
            fontWeight: 600,
            background: categoryStyle.bg,
            color: categoryStyle.text,
          }}
        >
          {event.category}
        </span>
      </div>
    </div>
  )
}

export function HistoryView() {
  const { historyEvents } = useAppStore(s => ({
    historyEvents: s.historyEvents,
  }))

  const [searchTerm, setSearchTerm] = useState('')

  const filteredEvents = useMemo(() => {
    if (!searchTerm) {
      return historyEvents
    }
    const lowerCaseSearch = searchTerm.toLowerCase()
    return historyEvents.filter(
      event =>
        event.title.toLowerCase().includes(lowerCaseSearch) ||
        event.subject?.toLowerCase().includes(lowerCaseSearch) ||
        event.description?.toLowerCase().includes(lowerCaseSearch)
    )
  }, [historyEvents, searchTerm])

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Historial de Actividad
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Bitácora de eventos relevantes del sistema.
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar evento o persona..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            border: '1px solid var(--border-strong)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px',
            minWidth: '300px',
          }}
        />
      </header>

      {filteredEvents.length > 0 ? (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {filteredEvents.map(event => (
            <HistoryEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div
          style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
        >
          No hay eventos para mostrar.
        </div>
      )}
    </div>
  )
}

