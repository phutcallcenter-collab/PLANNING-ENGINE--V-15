'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, memo, useState } from 'react'
import { INCIDENT_STYLES } from '../../domain/incidents/incidentStyles'
import { useAppStore } from '@/store/useAppStore'
import { StatusPill } from '../components/StatusPill'
import { Trash2, Pencil } from 'lucide-react'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'
import type { IncidentType, Incident } from '@/domain/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEditMode } from '@/hooks/useEditMode'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { parseLocalDate } from '@/domain/calendar/parseLocalDate'

// --- TYPES ---

import { EnrichedIncident } from './logHelpers'

interface PersonInGroup {
  repName: string
  count: number
  incidents: EnrichedIncident[]
}

interface GroupedByType {
  type: IncidentType
  totalCount: number
  people: PersonInGroup[]
  items?: EnrichedIncident[]
  totalPoints: number
}

interface DailyEventsListProps {
  title: string
  incidents: EnrichedIncident[]
  emptyMessage: string
}

// --- RENDER COMPONENTS ---

const PersonRow = memo(function PersonRow({
  person,
  onDeleteGroup,
  onDeleteSingle,
  canDelete,
}: {
  person: PersonInGroup
  onDeleteGroup: (ids: string[]) => void
  onDeleteSingle: (id: string) => void
  canDelete: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        borderRadius: '6px',
        background: '#f9fafb',
        border: '1px solid #f3f4f6'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>
          {person.repName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {person.count > 1 && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', background: '#e5e7eb', padding: '2px 6px', borderRadius: '10px' }}>
              x{person.count}
            </span>
          )}
          {canDelete && person.count > 1 && (
            <button
              onClick={() => onDeleteGroup(person.incidents.map(i => i.id))}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}
              title="Borrar todos"
            >
              Borrar todo
            </button>
          )}
        </div>
      </div>

      {/* 📋 LISTA DETALLADA OCULTA - SOLO CONTADOR */}
      {/* El usuario solicitó simplificar visualmente: solo mostrar "x2" en la cabecera */}
      {/* La lógica de borrado individual se sacrifica por simplicidad visual, o se hace vía borrado grupal */}
    </div>
  )
})

const OtherIncidentRow = memo(function OtherIncidentRow({
  incident,
  onDelete,
  canDelete,
}: {
  incident: EnrichedIncident
  onDelete: (id: string) => void
  canDelete: boolean
}) {
  const points = calculatePoints(incident)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        borderRadius: '6px',
        background: '#f9fafb',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
          {incident.repName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {points > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
              -{points} pts
            </div>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(incident.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {/* Comment hidden in daily view */}
    </div>
  )
})

// 🗓️ Helper removed - imported from domain/calendar/parseLocalDate

const RangeIncidentCard = memo(function RangeIncidentCard({
  incident,
  onDelete,
  canDelete,
}: {
  incident: EnrichedIncident
  onDelete: (id: string) => void
  canDelete: boolean
}) {
  const styleInfo = INCIDENT_STYLES[incident.type] ?? INCIDENT_STYLES['OTRO']

  // 🛡️ DEFENSIVE UI: Strict Validation
  // If incident data is incomplete, do NOT render garbage.
  if (
    typeof incident.progressRatio !== 'number' ||
    typeof incident.dayCount !== 'number' ||
    typeof incident.totalDuration !== 'number'
  ) {
    return null
  }

  const progress = incident.progressRatio * 100

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        marginBottom: '1rem',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        background: 'var(--bg-panel)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 15px',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <StatusPill label={styleInfo.label} variant={styleInfo.variant} />
        <div style={{ display: 'flex', gap: '8px' }}>
          {canDelete && (
            <button
              onClick={() => onDelete(incident.id)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>
      <div style={{ padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{incident.repName}</div>

        {/* Note Display Hidden in Daily View */}

        <div style={{ position: 'relative', width: '100%', background: '#f3f4f6', height: '8px', borderRadius: '4px' }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            background: styleInfo.variant === 'ok' ? '#22c55e' : '#3b82f6',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Día {incident.dayCount} de {incident.totalDuration}</span>
          {incident.returnDate && (
            <span style={{ fontWeight: 500 }}>
              Reingresa: {format(parseLocalDate(incident.returnDate), 'dd/MM/yyyy', { locale: es })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
})

const PunctualIncidentGroup = memo(function PunctualIncidentGroup({
  group,
  onDeleteSingle,
  onDeleteGroup,
  canDelete,
}: {
  group: GroupedByType
  onDeleteSingle: (id: string) => void
  onDeleteGroup: (ids: string[]) => void
  canDelete: boolean
}) {
  const styleInfo = INCIDENT_STYLES[group.type] ?? INCIDENT_STYLES['OTRO']

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        marginBottom: '1rem',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        background: 'var(--bg-panel)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 15px',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <StatusPill label={styleInfo.label} variant={styleInfo.variant} />
        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-main)' }}>
          {group.totalCount}
        </span>
      </header>
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {group.type === 'OTRO'
          ? group.items?.map(inc => (
            <OtherIncidentRow
              key={inc.id}
              incident={inc}
              onDelete={onDeleteSingle}
              canDelete={canDelete}
            />
          ))
          : group.people?.map(person => (
            <PersonRow
              key={person.repName}
              person={person}
              onDeleteGroup={onDeleteGroup}
              onDeleteSingle={onDeleteSingle}
              canDelete={canDelete}
            />
          ))}
      </div>
    </motion.div>
  )
})

export function DailyEventsList({
  title,
  incidents = [],
  emptyMessage,
}: DailyEventsListProps) {
  const { removeIncident, removeIncidents, showConfirm } = useAppStore(s => ({
    removeIncident: s.removeIncident,
    removeIncidents: s.removeIncidents,
    showConfirm: s.showConfirm
  }))

  const { mode } = useEditMode()
  const canDelete = mode === 'ADMIN_OVERRIDE'

  // Local state for editing note removed per rule: Comments only in detail modal

  const { punctualGroups, rangeIncidents } = useMemo(() => {
    const orderedIncidents = [...incidents].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    )

    const punctual = orderedIncidents.filter(i => i.type !== 'LICENCIA' && i.type !== 'VACACIONES')
    const range = orderedIncidents.filter(i => i.type === 'LICENCIA' || i.type === 'VACACIONES')

    const byType = new Map<IncidentType, EnrichedIncident[]>()
    for (const inc of punctual) {
      if (!byType.has(inc.type)) byType.set(inc.type, [])
      byType.get(inc.type)!.push(inc)
    }

    const groups: GroupedByType[] = []
    for (const [type, list] of byType.entries()) {
      if (type === 'OTRO') {
        groups.push({
          type,
          totalCount: list.length,
          items: list,
          totalPoints: list.reduce((sum, i) => sum + calculatePoints(i), 0),
          people: [],
        })
        continue
      }

      const peopleMap = new Map<string, PersonInGroup>()
      for (const inc of list) {
        if (!peopleMap.has(inc.repName)) {
          peopleMap.set(inc.repName, {
            repName: inc.repName,
            count: 0,
            incidents: [],
          })
        }
        const personGroup = peopleMap.get(inc.repName)!
        personGroup.count++
        personGroup.incidents.push(inc)
      }

      groups.push({
        type,
        totalCount: list.length,
        people: Array.from(peopleMap.values()),
        totalPoints: list.reduce((sum, i) => sum + calculatePoints(i), 0),
      })
    }

    const sortedGroups = groups.sort((a, b) => {
      const order: Record<IncidentType, number> = { AUSENCIA: 1, TARDANZA: 2, ERROR: 3, OTRO: 4, VACACIONES: 5, LICENCIA: 6, OVERRIDE: 7, SWAP: 8 }
      return (order[a.type] || 99) - (order[b.type] || 99)
    })

    return { punctualGroups: sortedGroups, rangeIncidents: range }
  }, [incidents])

  const handleDeleteGroup = async (person: PersonInGroup, type: IncidentType) => {
    const styleInfo = INCIDENT_STYLES[type] ?? INCIDENT_STYLES['OTRO']
    const confirmed = await showConfirm({
      title: `¿Eliminar ${person.count} incidencia(s)?`,
      description: `Esto eliminará permanentemente todas las incidencias de tipo "${styleInfo.label}" registradas para ${person.repName} en este día.`,
      intent: 'danger',
      confirmLabel: 'Sí, eliminar',
    })
    if (confirmed) {
      removeIncidents(person.incidents.map(i => i.id))
    }
  }

  const handleDeleteSingle = async (incident: EnrichedIncident) => {
    const confirmed = await showConfirm({
      title: `¿Eliminar incidencia?`,
      description: `Esto eliminará permanentemente la incidencia "${incident.note || INCIDENT_STYLES[incident.type].label
        }" registrada para ${incident.repName}.`,
      intent: 'danger',
      confirmLabel: 'Sí, eliminar',
    })
    if (confirmed) {
      removeIncident(incident.id)
    }
  }

  // Editing handlers removed

  const hasItems = incidents.length > 0

  return (
    <section>
      <h3
        style={{
          marginBottom: '0.75rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{title}</span>
        {incidents.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {incidents.length} evento(s)
          </span>
        )}
      </h3>

      <AnimatePresence mode="popLayout">
        {!hasItems && (
          <motion.div
            key="empty-day"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '20px 0',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px dashed #e5e7eb',
            }}
          >
            {emptyMessage}
          </motion.div>
        )}

        {rangeIncidents.map(incident => (
          <RangeIncidentCard
            key={incident.id}
            incident={incident}
            onDelete={() => handleDeleteSingle(incident)}
            canDelete={canDelete}
          />
        ))}

        {punctualGroups.map(group => (
          <PunctualIncidentGroup
            key={group.type}
            group={group}
            onDeleteSingle={(id) => {
              const incident = group.people?.flatMap(p => p.incidents).find(i => i.id === id)
              if (incident) handleDeleteSingle(incident)
            }}
            onDeleteGroup={(ids) => {
              const person = group.people?.find(p => p.incidents.some(i => i.id === ids[0]));
              if (person) handleDeleteGroup(person, group.type)
            }}
            canDelete={canDelete}
          />
        ))}

      </AnimatePresence>

      {/* ConfirmDialog for editing removed */}
    </section>
  )
}
