'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { DailyEventsList } from './DailyEventsList'
import {
  Representative,
  IncidentType,
  ISODate,
  IncidentInput,
  Incident,
  ShiftType,
  DayInfo,
  WeeklyPlan,
  ShiftAssignment,
} from '../../domain/types'
import { useIncidentFlow } from '../../hooks/useIncidentFlow'
import * as humanize from '@/application/presenters/humanize'
import { resolveIncidentDates } from '../../domain/incidents/resolveIncidentDates'
import { checkIncidentConflicts } from '../../domain/incidents/checkIncidentConflicts'
import { Sun, Moon, Users, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan'
import { useWeekNavigator } from '@/hooks/useWeekNavigator'
import { InlineAlert } from '../components/InlineAlert'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  getEffectiveDailyLogData,
  DailyLogEntry,
} from '@/application/ui-adapters/getEffectiveDailyLogData'
import { format, parseISO, addDays, subDays, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarGrid } from '../components/CalendarGrid'
import { isWorking, isExpected } from '@/application/ui-adapters/dailyLogUtils'

const styles = {
  btnPrimary: {
    backgroundColor: 'var(--accent)',
    color: 'white',
    padding: '10px',
    borderRadius: 'var(--radius-md)',
    fontWeight: 'var(--font-weight-semibold)',
    transition: 'all 0.2s ease',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  btnDisabled: {
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  input: {
    width: '100%',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    fontSize: 'var(--font-size-base)',
    boxSizing: 'border-box' as React.CSSProperties['boxSizing'],
    background: 'var(--bg-surface)',
    color: 'var(--text-main)',
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    marginBottom: '6px',
    color: 'var(--text-main)',
  },
  listItem: {
    width: '100%',
    textAlign: 'left' as 'left',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-main)',
  },
  activeListItem: {
    background: 'var(--bg-subtle)',
    fontWeight: 'var(--font-weight-semibold)',
  },
}

export type EnrichedIncident = Incident & {
  repName: string
  repShift: ShiftType
  dayCount: number
  totalDuration: number
  returnDate: ISODate
}

const ShiftStatusDisplay = ({
  label,
  isActive,
  onClick,
  presentCount,
  plannedCount,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  presentCount: number
  plannedCount: number
}) => {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#f9fafb',
    borderColor: '#f3f4f6',
    position: 'relative',
  }

  if (isActive) {
    baseStyle.background = 'white'
    baseStyle.borderColor = '#e5e7eb'
    baseStyle.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
  }

  return (
    <button onClick={onClick} style={baseStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {label === 'Día' ? (
          <Sun size={18} style={{ color: '#fbbf24' }} />
        ) : (
          <Moon size={18} style={{ color: '#a5b4fc' }} />
        )}
        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
          {label}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Users size={14} style={{ color: 'var(--text-muted)' }} />
        <span
          style={{
            fontWeight: 700,
            fontSize: '1.25rem',
            color: 'var(--text-main)',
          }}
        >
          {presentCount}
        </span>
        <span style={{ fontWeight: 500, fontSize: '1rem', color: '#9ca3af' }}>
          / {plannedCount}
        </span>
      </div>
    </button>
  )
}

export function DailyLogView() {
  const {
    incidents,
    allCalendarDaysForRelevantMonths,
    representatives,
    planningAnchorDate,
    setPlanningAnchorDate,
    swaps,
    isLoading,
    effectivePeriods,
    pushUndo,
    removeIncident,
  } = useAppStore(s => ({
    incidents: s.incidents,
    allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
    representatives: s.representatives,
    planningAnchorDate: s.planningAnchorDate,
    setPlanningAnchorDate: s.setPlanningAnchorDate,
    swaps: s.swaps,
    isLoading: s.isLoading,
    effectivePeriods: s.effectivePeriods ?? [],
    pushUndo: s.pushUndo,
    removeIncident: s.removeIncident,
  }))

  // 🎯 SIEMPRE empezar en el día actual (hoy)
  // No sincronizar con planningAnchorDate para que siempre muestre "hoy" al entrar
  const [logDate, setLogDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  const { weekDays } = useWeekNavigator(logDate, setLogDate)
  const { weeklyPlan } = useWeeklyPlan(weekDays)

  const [activeShift, setActiveShift] = useState<ShiftType>('DAY')
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [incidentType, setIncidentType] = useState<IncidentType>('TARDANZA')
  const [note, setNote] = useState('')
  const [duration, setDuration] = useState(1)
  const [customPoints, setCustomPoints] = useState(0)

  // 🛡️ CONFIRM DIALOG STATE
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean
    title: string
    description: React.ReactNode
    confirmText: string
    cancelText: string
    resolve: (value: boolean) => void
  } | null>(null)

  const showConfirm = (options: {
    title: string
    description: React.ReactNode
    confirmText: string
    cancelText: string
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmConfig({
        open: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        resolve: (val) => {
          setConfirmConfig(null)
          resolve(val)
        },
      })
    })
  }

  // --- Close calendar on outside click ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarRef]);

  // ⚠️ ADAPTER INTEGRATION
  const dailyLogEntries = useMemo(() => {
    if (!weeklyPlan || isLoading) return []
    return getEffectiveDailyLogData(
      weeklyPlan,
      swaps,
      incidents,
      logDate,
      allCalendarDaysForRelevantMonths,
      representatives,
      effectivePeriods
    )
  }, [
    weeklyPlan,
    swaps,
    incidents,
    logDate,
    allCalendarDaysForRelevantMonths,
    representatives,
    isLoading,
    effectivePeriods,
  ])

  const {
    representativesInShift,
    dayShiftPresent,
    nightShiftPresent,
    dayShiftPlanned,
    nightShiftPlanned,
  } = useMemo(() => {
    if (!weeklyPlan || isLoading)
      return {
        representativesInShift: [],
        dayShiftPresent: 0,
        nightShiftPresent: 0,
        dayShiftPlanned: 0,
        nightShiftPlanned: 0,
      }

    // Coverage Counts
    const dayEntries = dailyLogEntries.filter(e => e.shift === 'DAY')
    const nightEntries = dailyLogEntries.filter(e => e.shift === 'NIGHT')

    // 🧠 Metric Logic: present / planned ≠ coverage demand
    const dayShiftPresent = dayEntries.filter(isWorking).length
    const nightShiftPresent = nightEntries.filter(isWorking).length

    const dayShiftPlanned = dayEntries.filter(isExpected).length
    const nightShiftPlanned = nightEntries.filter(isExpected).length

    // Representatives List (Active Shift)
    const activeEntries = activeShift === 'DAY' ? dayEntries : nightEntries
    const repMap = new Map(representatives.map(r => [r.id, r]))

    // 🔴 UX REFINEMENT: Administrative incidents ignore operational shift
    if (incidentType === 'VACACIONES' || incidentType === 'LICENCIA') {
      const representativesInShift = representatives
        .filter(r => r.isActive !== false)
        // Sort alphabetically to be nice
        .sort((a, b) => a.name.localeCompare(b.name))

      return {
        representativesInShift,
        dayShiftPresent,
        nightShiftPresent,
        dayShiftPlanned,
        nightShiftPlanned,
      }
    }

    const representativesInShift = activeEntries
      .filter(e => {
        // B2/B3 Separation of Concerns:
        // 1. isExpected(e) -> TRUE (Keeps them in the math: 13/14)
        // 2. We explicitly HIDE them from the list if they are ABSENT
        return isExpected(e) && e.logStatus !== 'ABSENT'
      })
      .map(e => repMap.get(e.representativeId))
      .filter((r): r is Representative => !!r && r.isActive)

    return {
      representativesInShift,
      dayShiftPresent,
      nightShiftPresent,
      dayShiftPlanned,
      nightShiftPlanned,
    }
  }, [dailyLogEntries, activeShift, weeklyPlan, representatives, isLoading, incidentType])

  const filteredRepresentatives = useMemo(() => {
    if (!searchTerm) return representativesInShift
    return representativesInShift.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [representativesInShift, searchTerm])

  const { dayIncidents, ongoingIncidents } = useMemo(() => {
    if (isLoading) return { dayIncidents: [], ongoingIncidents: [] };

    const repMap = new Map(representatives.map(r => [r.id, r]))

    const allRelevantIncidents: EnrichedIncident[] = incidents
      .map(incident => {
        if (incident.type === 'OVERRIDE') return null
        const rep = repMap.get(incident.representativeId)
        if (!rep) return null
        const resolved = resolveIncidentDates(
          incident,
          allCalendarDaysForRelevantMonths,
          rep
        )
        const isActiveToday = resolved.dates.includes(logDate)
        if (!isActiveToday) return null

        let dayCount = resolved.dates.indexOf(logDate) + 1
        let totalDuration = resolved.dates.length

        // 🧠 SMART DISPLAY FOR VACATIONS
        // If it's a vacation, we want to display "Day X of N (Working Days)".
        // So we must recalculate the numerator and denominator to ignore Holidays/OFFs.
        if (incident.type === 'VACACIONES') {
          totalDuration = incident.duration ?? 14

          // Recalculate numerator: How many WORKING days have passed up to today?
          let workingDaysSoFar = 0
          const visibleDates = resolved.dates
          const todayIndex = visibleDates.indexOf(logDate)

          for (let i = 0; i <= todayIndex; i++) {
            const dString = visibleDates[i]
            const dInfo = allCalendarDaysForRelevantMonths.find(d => d.date === dString)

            // Replicate 'isCountable' logic from resolveIncidentDates
            const dayOfWeek = parseISO(dString).getUTCDay()
            const isBaseOff = rep.baseSchedule[dayOfWeek] === 'OFF'
            const isHoliday = dInfo?.isSpecial === true // or kind === 'HOLIDAY'

            // Only count if Working AND Not Special AND Not Base Off
            // (Note: resolved.dates already excludes Base Off per previous step, but check safely)
            if (!isBaseOff && !isHoliday) {
              workingDaysSoFar++
            }
          }
          // Ensure it's at least 1 if it's active
          dayCount = Math.max(1, workingDaysSoFar)
        }

        return {
          ...incident,
          repName: rep.name,
          repShift: rep.baseShift,
          dayCount,
          totalDuration,
          returnDate: resolved.returnDate,
        }
      })
      .filter((i): i is EnrichedIncident => !!i)

    return {
      dayIncidents: allRelevantIncidents.filter(
        i => i.type !== 'VACACIONES' && i.type !== 'LICENCIA'
      ),
      ongoingIncidents: allRelevantIncidents.filter(
        i => i.type === 'VACACIONES' || i.type === 'LICENCIA'
      ),
    }
  }, [incidents, logDate, allCalendarDaysForRelevantMonths, representatives, isLoading])

  const resetForm = useCallback((keepRep: boolean = false) => {
    setIncidentType('TARDANZA')
    setNote('')
    setDuration(1)
    setCustomPoints(0)
    if (!keepRep) {
      setSelectedRep(null)
      setSearchTerm('')
    }
  }, [])

  const { submit } = useIncidentFlow({
    onSuccess: (incidentId?: string) => {
      // ✅ SUCCESS: Trigger Undo UI here
      // Fix M2: Ensure this always fires and gives feedback
      if (incidentId) {
        pushUndo({
          label: 'Evento registrado', // Generic label for consistency
          undo: () => removeIncident(incidentId, true), // Silent remove
        }, 5000) // 5 seconds per user request (5-7s)
      }
      resetForm(true)
    },
  })

  // ✅ STEP 3: Preventive validation (non-blocking)
  const conflictCheck = useMemo(() => {
    if (!selectedRep || isLoading) return { hasConflict: false }

    return checkIncidentConflicts(
      selectedRep.id,
      logDate,
      incidentType,
      duration,
      incidents,
      allCalendarDaysForRelevantMonths,
      selectedRep
    )
  }, [selectedRep, logDate, incidentType, duration, incidents, allCalendarDaysForRelevantMonths, isLoading])

  // 🛡️ UX PROTECTION: Avoid zombie states
  // If the user changes incident type and the selected rep is no longer in the list, clear selection.
  useEffect(() => {
    if (!selectedRep) return
    const stillVisible = representativesInShift.some(r => r.id === selectedRep.id)
    if (!stillVisible) {
      setSelectedRep(null)
      setSearchTerm('')
    }
  }, [incidentType, representativesInShift, selectedRep])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRep) return

    let finalIncidentType = incidentType
    let details: string | undefined

    // 🟢 INTERSTITIAL CONFIRMATION for ABSENCE
    if (incidentType === 'AUSENCIA') {
      const isJustified = await showConfirm({
        title: 'Confirmar Ausencia',
        description: (
          <span>
            ¿Registrar <strong>Ausencia</strong> a <strong>{selectedRep.name}</strong>?
            <br />
            <span style={{ fontSize: '0.9em', color: '#6b7280' }}>
              Seleccione si es justificada o no.
            </span>
          </span>
        ),
        confirmText: 'Sí, justificada',
        cancelText: 'No, injustificada',
      })

      if (isJustified) {
        details = 'JUSTIFICADA'
      }
    }

    const isMultiDay =
      finalIncidentType === 'LICENCIA' || finalIncidentType === 'VACACIONES'

    const incidentInput: IncidentInput = {
      representativeId: selectedRep.id,
      type: finalIncidentType,
      startDate: logDate,
      duration: isMultiDay ? duration : 1,
      customPoints: finalIncidentType === 'OTRO' ? customPoints : undefined,
      note: note.trim() || undefined,
      details,
    }
    submit(incidentInput, selectedRep)
  }

  const dateForLog = parseISO(logDate)

  if (isLoading || allCalendarDaysForRelevantMonths.length === 0) {
    return <div>Cargando...</div>
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        height: 'calc(100vh - 200px)',
        gap: 'var(--space-md)',
        fontFamily: 'sans-serif',
        background: 'var(--bg-app)',
        padding: 'var(--space-lg)',
      }}
    >
      <aside
        style={{
          flexShrink: 0,
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <h3
            style={{ fontWeight: 'var(--font-weight-medium)', margin: '0 0 var(--space-md) 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}
          >
            Estado de Turnos
          </h3>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
          >
            <ShiftStatusDisplay
              label="Día"
              isActive={activeShift === 'DAY'}
              onClick={() => setActiveShift('DAY')}
              presentCount={dayShiftPresent}
              plannedCount={dayShiftPlanned}
            />
            <ShiftStatusDisplay
              label="Noche"
              isActive={activeShift === 'NIGHT'}
              onClick={() => setActiveShift('NIGHT')}
              presentCount={nightShiftPresent}
              plannedCount={nightShiftPlanned}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ ...styles.label, marginBottom: 'var(--space-sm)' }}>
            Representantes del Turno
          </label>
          {(incidentType === 'VACACIONES' || incidentType === 'LICENCIA') && (
            <div style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-xs)', color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>
              Mostrando <strong>todos</strong> para registro administrativo.
            </div>
          )}
          <input
            type="text"
            placeholder="Buscar representante..."
            style={{ ...styles.input, marginBottom: 'var(--space-md)' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {filteredRepresentatives.map(rep => (
              <button
                key={rep.id}
                onClick={() => setSelectedRep(rep)}
                style={{
                  ...styles.listItem,
                  ...(selectedRep?.id === rep.id ? styles.activeListItem : {}),
                }}
              >
                {rep.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '74px',
            boxSizing: 'border-box',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h2 style={{ margin: '0 0 var(--space-xl) 0', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>
            Registro de Eventos
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={calendarRef}>
            <button
              onClick={() => setLogDate(format(subDays(dateForLog, 1), 'yyyy-MM-dd'))}
              style={{ padding: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', borderRadius: '6px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', minWidth: '220px', textAlign: 'center' }}>
              {format(dateForLog, "EEEE, dd 'de' MMMM", { locale: es })}
            </div>
            <button
              onClick={() => setLogDate(format(addDays(dateForLog, 1), 'yyyy-MM-dd'))}
              style={{ padding: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', borderRadius: '6px', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => setIsCalendarOpen(prev => !prev)}
              style={{ padding: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-panel)', borderRadius: '6px', cursor: 'pointer' }}
            >
              <CalendarIcon size={16} />
            </button>

            {!isToday(dateForLog) && (
              <button
                onClick={() => setLogDate(format(new Date(), 'yyyy-MM-dd'))}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '6px',
                  background: 'var(--bg-panel)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hoy
              </button>
            )}

            {isCalendarOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '16px',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                <CalendarGrid
                  month={dateForLog}
                  selected={dateForLog}
                  onSelect={(d) => {
                    setLogDate(format(d, 'yyyy-MM-dd'));
                    setIsCalendarOpen(false);
                  }}
                  days={[]}
                />
              </div>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <header>
              <h3 style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>
                {selectedRep ? (
                  <>
                    Registrar para:{' '}
                    <span style={{ fontWeight: 700 }}>{selectedRep.name}</span>
                  </>
                ) : (
                  'Seleccione un representante para comenzar'
                )}
              </h3>
            </header>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
              }}
            >
              <div>
                <label style={styles.label}>Tipo de incidencia</label>
                <select
                  style={styles.input}
                  value={incidentType}
                  onChange={e =>
                    setIncidentType(e.target.value as IncidentType)
                  }
                // disabled={!selectedRep} <-- REMOVED THIS LINE
                >
                  <option value="TARDANZA">Tardanza</option>
                  <option value="AUSENCIA">Ausencia</option>
                  <option value="ERROR">Error</option>
                  <option value="OTRO">Otro</option>
                  <option value="LICENCIA">Licencia</option>
                  <option value="VACACIONES">Vacaciones</option>
                </select>
              </div>

              {(incidentType === 'LICENCIA' ||
                incidentType === 'VACACIONES') && (
                  <div>
                    <label style={styles.label}>
                      Duración (
                      {incidentType === 'LICENCIA'
                        ? 'días naturales'
                        : 'días laborables'}
                      )
                    </label>
                    <input
                      type="number"
                      style={styles.input}
                      min="1"
                      value={duration}
                      onChange={e =>
                        setDuration(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      disabled={!selectedRep}
                    />
                  </div>
                )}

              {incidentType === 'OTRO' && (
                <div>
                  <label style={styles.label}>Puntos (manual)</label>
                  <input
                    type="number"
                    style={styles.input}
                    min="0"
                    value={customPoints}
                    onChange={e =>
                      setCustomPoints(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    disabled={!selectedRep}
                  />
                </div>
              )}
            </div>
            <div>
              <label style={styles.label}>Comentario (opcional)</label>
              <textarea
                style={{ ...styles.input, height: '60px' }}
                placeholder="Escribe un comentario..."
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={!selectedRep}
              />
            </div>

            {/* ⚠️ STEP 3: Inline conflict warning */}
            {conflictCheck.hasConflict && (
              <InlineAlert variant="warning">
                {conflictCheck.message}
              </InlineAlert>
            )}

            <div>
              <button
                type="submit"
                disabled={!selectedRep}
                style={{
                  padding: '10px 16px',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  backgroundColor: !selectedRep ? 'var(--bg-subtle)' : 'var(--accent)',
                  color: !selectedRep ? 'var(--text-muted)' : '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: !selectedRep ? 'not-allowed' : 'pointer',
                  width: '100%',
                  transition: 'background-color 0.2s',
                }}
              >
                Registrar evento
              </button>
            </div>
          </div>
        </form>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-md)',
            overflowY: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--space-lg)',
              overflowY: 'auto',
              marginBottom: 'var(--space-lg)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <DailyEventsList
              title="Incidencias del Día"
              incidents={dayIncidents}
              emptyMessage="No hay incidencias puntuales registradas hoy."
            />
          </div>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--space-lg)',
              overflowY: 'auto',
              marginBottom: 'var(--space-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <DailyEventsList
              title="Eventos en Curso (Todos)"
              incidents={ongoingIncidents}
              emptyMessage="No hay licencias o vacaciones activas."
            />
          </div>
        </div>
      </section>

      {/* GLOBAL CONFIRM DIALOG */}
      {
        confirmConfig && (
          <ConfirmDialog
            open={confirmConfig.open}
            title={confirmConfig.title}
            description={confirmConfig.description}
            intent="warning"
            confirmLabel={confirmConfig.confirmText}
            cancelLabel={confirmConfig.cancelText}
            onConfirm={() => confirmConfig.resolve(true)}
            onCancel={() => confirmConfig.resolve(false)}
          />
        )
      }
    </div >
  )
}

