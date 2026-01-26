'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type {
  IncidentWithPoints,
  MonthlySummary,
  PersonMonthlySummary,
  RiskLevel,
} from '@/domain/analytics/types'
import {
  format,
  isSameDay,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { INCIDENT_STYLES } from '@/domain/incidents/incidentStyles'
import { useAppStore } from '@/store/useAppStore'
import { CalendarGrid, CalendarDay } from '../components/CalendarGrid'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'
import { parseLocalDate } from '@/domain/calendar/parseLocalDate'

const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const styles: Record<RiskLevel, React.CSSProperties> = {
    danger: {
      backgroundColor: '#fdecea',
      color: '#b42318',
    },
    warning: {
      backgroundColor: '#fff3cd',
      color: '#9a6a00',
    },
    ok: {
      backgroundColor: '#e6f9ee',
      color: '#1c7c44',
    },
  }

  const labels: Record<RiskLevel, string> = {
    danger: 'RIESGO',
    warning: 'ATENCIÓN',
    ok: 'OK',
  }

  return (
    <span
      style={{
        ...styles[level],
        padding: '6px 12px',
        borderRadius: '99px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {labels[level]}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: '#f9fafb',
        border: '1px solid #f3f4f6',
        borderRadius: '8px',
        padding: '8px 12px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '2px',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
        {value}
      </div>
    </div>
  )
}

// Helper removed - imported from domain/calendar/parseLocalDate

export function PersonDetailModal({
  summary,
  personId,
  onClose,
}: {
  summary: MonthlySummary
  personId: string
  onClose: () => void
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { openDetailModal, representatives, allCalendarDays } = useAppStore(s => ({
    openDetailModal: s.openDetailModal,
    representatives: s.representatives,
    allCalendarDays: s.allCalendarDaysForRelevantMonths,
  }))

  const currentPersonSummary = useMemo(() => {
    if (!summary || !personId) return null
    return summary.byPerson.find(p => p.representativeId === personId)
  }, [summary, personId])

  const currentRepresentative = useMemo(() => {
    return representatives.find(r => r.id === personId)
  }, [representatives, personId])

  const visibleMonthDate = useMemo(() => {
    return parseISO(`${summary.month}-01`)
  }, [summary.month])

  const handleMonthChange = (offset: number) => {
    const newMonth = new Date(
      visibleMonthDate.getFullYear(),
      visibleMonthDate.getMonth() + offset,
      1
    )
    openDetailModal(personId, format(newMonth, 'yyyy-MM'))
    setSelectedDate(null)
  }

  // Manage body scroll and escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const monthLabel = useMemo(
    () => format(visibleMonthDate, 'MMMM yyyy', { locale: es }),
    [visibleMonthDate]
  )

  const displayedEvents = useMemo(() => {
    if (!currentPersonSummary?.incidents || !currentRepresentative) return []
    if (!selectedDate) return currentPersonSummary.incidents

    const dateKey = format(selectedDate, 'yyyy-MM-dd')

    const result = currentPersonSummary.incidents.filter(i => {
      // Para vacaciones/licencias, verificar si la fecha seleccionada está en el rango
      if (i.type === 'VACACIONES' || i.type === 'LICENCIA') {
        const resolved = resolveIncidentDates(i, allCalendarDays, currentRepresentative)
        return resolved.dates.includes(dateKey)
      }
      // Para otros, verificar fecha de inicio
      return i.startDate === dateKey
    })

    // Sort: Chronological ASC (strictly by start date)
    const today = format(new Date(), 'yyyy-MM-dd')

    return result.sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [selectedDate, currentPersonSummary, currentRepresentative, allCalendarDays])

  const calendarDays = useMemo((): CalendarDay[] => {
    if (!currentPersonSummary || !currentRepresentative) return []

    const daysWithIncidents = new Map<string, { points: number, isOffDay: boolean, visualTypes: import('@/ui/components/CalendarGrid').DayVisualType[] }>()

    // Marcar días del mes completo con sus días OFF
    const year = parseInt(summary.month.split('-')[0])
    const month = parseInt(summary.month.split('-')[1]) - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      const isOffDay = currentRepresentative.baseSchedule[dayOfWeek] === 'OFF'
      const dateStr = format(date, 'yyyy-MM-dd')
      daysWithIncidents.set(dateStr, { points: 0, isOffDay, visualTypes: [] })
    }

    // Marcar incidencias y capas visuales
    for (const incident of currentPersonSummary.incidents) {
      if (!incident.startDate) continue

      // Para vacaciones y licencias, expandir a todos los días (banda continua)
      if (incident.type === 'VACACIONES' || incident.type === 'LICENCIA') {
        const resolved = resolveIncidentDates(incident, allCalendarDays, currentRepresentative)
        const visualType = incident.type === 'VACACIONES' ? 'VACATION' : 'LICENSE'

        for (const dateStr of resolved.dates) {
          const existing = daysWithIncidents.get(dateStr)
          if (existing) {
            const incidentPoints = calculatePoints(incident)
            existing.points += incidentPoints
            existing.visualTypes.push(visualType as any)
          }
        }
      } else {
        // Incidencias puntuales
        const existing = daysWithIncidents.get(incident.startDate)
        if (existing) {
          const incidentPoints = calculatePoints(incident)
          existing.points += incidentPoints

          // Mapear tipo de incidencia a capa visual
          if (incident.type === 'AUSENCIA') {
            existing.visualTypes.push('ABSENT' as any)
          }
          // TODO: Agregar HOLIDAY y SHIFT_CHANGE cuando estén disponibles en el dominio
        }
      }
    }

    // Resolver visual final por prioridad
    function resolveDayVisual(types: import('@/ui/components/CalendarGrid').DayVisualType[]): import('@/ui/components/CalendarGrid').DayVisualType {
      if (types.includes('ABSENT')) return 'ABSENT'
      if (types.includes('VACATION')) return 'VACATION'
      if (types.includes('LICENSE')) return 'LICENSE'
      if (types.includes('HOLIDAY')) return 'HOLIDAY'
      if (types.includes('SHIFT_CHANGE')) return 'SHIFT_CHANGE'
      return 'NORMAL'
    }

    return Array.from(daysWithIncidents.entries()).map(([dateStr, data]) => {
      let state: CalendarDay['state'] = 'normal'

      if (data.isOffDay && data.points === 0) {
        state = 'disabled'  // Días OFF sin incidencias = opaco
      } else if (data.points >= 6) {
        state = 'danger'
      } else if (data.points > 0) {
        state = 'warning'
      }

      return {
        date: parseLocalDate(dateStr),
        state: state,
        visualType: resolveDayVisual(data.visualTypes)
      }
    })
  }, [currentPersonSummary, currentRepresentative, summary.month, allCalendarDays])


  const renderContent = () => {
    if (!currentPersonSummary) {
      return (
        <div
          style={{
            padding: '24px',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
          }}
        >
          No se encontró información para este representante en el mes seleccionado.
        </div>
      )
    }

    const { totals, riskLevel, name } = currentPersonSummary

    return (
      <>
        <header
          style={{
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
              {name}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '8px',
              }}
            >
              <button
                onClick={() => handleMonthChange(-1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <p
                style={{
                  margin: 0,
                  color: '#374151',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  width: '140px',
                  textAlign: 'center',
                }}
              >
                {monthLabel}
              </p>
              <button
                onClick={() => handleMonthChange(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            <X size={24} />
          </button>
        </header>

        <div
          style={{
            margin: '16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <Stat label="Ausencias" value={totals.ausencias} />
            <Stat label="Tardanzas" value={totals.tardanzas} />
            <Stat label="Errores" value={totals.errores} />
            <Stat label="Puntos" value={totals.puntos} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '2px',
                fontWeight: 500,
              }}
            >
              Estado General
            </div>
            <RiskBadge level={riskLevel} />
          </div>
        </div>

        <div
          style={{
            flex: '1 1 auto',
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '24px',
            overflow: 'hidden',
            marginTop: '16px',
          }}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <CalendarGrid
              month={visibleMonthDate}
              days={calendarDays}
              selected={selectedDate}
              onSelect={setSelectedDate}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                margin: 0,
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                Eventos
                {selectedDate
                  ? ` para ${format(selectedDate, 'd MMM', { locale: es })}`
                  : ` del Mes`}
              </span>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  style={{
                    fontSize: 12,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 500,
                  }}
                >
                  Mostrar todo el mes
                </button>
              )}
            </h3>
            <div
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                paddingRight: '8px',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDate?.toISOString() || 'month-view'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {displayedEvents.length === 0 ? (
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        padding: '20px 0',
                      }}
                    >
                      {selectedDate
                        ? 'No se registraron incidencias en este día.'
                        : 'No se registraron incidencias con penalización este mes.'}
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {displayedEvents.map(i => {
                        const styleInfo =
                          INCIDENT_STYLES[i.type] ?? INCIDENT_STYLES['OTRO']

                        // Para vacaciones/licencias, mostrar rango completo
                        let dateLabel = ''
                        let workingDaysInfo = ''

                        if (i.type === 'VACACIONES' || i.type === 'LICENCIA') {
                          const resolved = resolveIncidentDates(i, allCalendarDays, currentRepresentative!)

                          if (resolved.start && resolved.end && resolved.returnDate) {
                            const startFormatted = format(parseLocalDate(resolved.start), "dd 'de' MMMM", { locale: es })
                            const endFormatted = format(parseLocalDate(resolved.end), "dd 'de' MMMM", { locale: es })
                            const returnFormatted = format(parseLocalDate(resolved.returnDate), "dd 'de' MMMM", { locale: es })

                            dateLabel = `${i.type === 'VACACIONES' ? 'Vacaciones' : 'Licencia'} del ${startFormatted} al ${endFormatted}`
                            workingDaysInfo = i.type === 'VACACIONES'
                              ? `${resolved.dates.length} días laborables • Retorna ${returnFormatted}`
                              : `${resolved.dates.length} días naturales • Retorna ${returnFormatted}`
                          }
                        } else {
                          dateLabel = i.startDate
                            ? format(parseLocalDate(i.startDate), "EEEE, dd 'de' MMMM", { locale: es })
                            : 'Fecha no disponible'
                        }

                        const points = calculatePoints(i)

                        return (
                          <li
                            key={i.id}
                            style={{
                              borderBottom: '1px solid #f3f4f6',
                              padding: '12px 4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '14px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 500,
                                  color: '#374151',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor:
                                      styleInfo.variant === 'danger'
                                        ? 'hsl(0, 100%, 97%)'
                                        : styleInfo.variant === 'warning'
                                          ? 'hsl(45, 100%, 96%)'
                                          : 'hsl(220, 15%, 96%)',
                                    color:
                                      styleInfo.variant === 'danger'
                                        ? 'hsl(0, 70%, 45%)'
                                        : styleInfo.variant === 'warning'
                                          ? 'hsl(45, 70%, 35%)'
                                          : 'hsl(220, 10%, 40%)',
                                  }}
                                >
                                  {styleInfo.label}
                                </span>
                                <span style={{ color: '#6b7280' }}>
                                  {dateLabel}
                                </span>
                              </div>
                              {workingDaysInfo && (
                                <p
                                  style={{
                                    fontSize: '12px',
                                    color: '#059669',
                                    margin: '0',
                                    paddingLeft: '8px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {workingDaysInfo}
                                </p>
                              )}
                              {i.note && (
                                <p
                                  style={{
                                    fontSize: '14px',
                                    color: '#374151',
                                    fontStyle: 'normal',
                                    marginTop: '4px',
                                    paddingLeft: '8px',
                                    borderLeft: '3px solid var(--border-subtle)',
                                  }}
                                >
                                  {i.note}
                                </p>
                              )}
                            </div>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '16px',
                                color: points > 0 ? '#b91c1c' : '#374151',
                              }}
                            >
                              {points > 0 ? `-${points}` : points}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Cerrar
          </button>
        </div>
      </>
    )
  }
  return (
    <>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 50,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
        onClick={onClose}
      >
        <motion.div
          key="modal-content"
          ref={modalRef}
          tabIndex={-1}
          style={{
            outline: 'none',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '700px',
            maxWidth: '90vw',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </>
  )
}
