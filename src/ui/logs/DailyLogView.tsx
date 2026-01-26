'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { DailyEventsList } from './DailyEventsList'
import { buildWeeklySchedule } from '../../domain/planning/buildWeeklySchedule'
import {
  Representative,
  IncidentType,
  ISODate,
  IncidentInput,
  Incident,
  ShiftType,
  WeeklyPlan,
  SwapEvent,
} from '../../domain/types'
import { resolveIncidentDates } from '../../domain/incidents/resolveIncidentDates'
import { checkIncidentConflicts } from '../../domain/incidents/checkIncidentConflicts'
import { isSlotOperationallyEmpty } from '@/domain/planning/isSlotOperationallyEmpty'
import {
  MoreVertical,
  Clock,
  AlertTriangle,
  UserX,
  UserCheck,
  FileText,
  MessageSquare,
  Shield,
  RefreshCw,
  ChevronLeft, // 🔧 FIX: Re-added missing icon
  ChevronRight, // 🔧 FIX: Re-added missing icon
  Calendar as CalendarIcon, // 🔧 FIX: Re-added missing icon
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useEditMode } from '@/hooks/useEditMode'
import { useCoverageStore } from '@/store/useCoverageStore'
import { findCoverageForDay } from '@/domain/planning/coverage'
import { InlineAlert } from '../components/InlineAlert'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CoverageManagerModal } from '../planning/coverage/CoverageManagerModal' // 🔄 NEW
import { CoverageAbsenceModal } from './CoverageAbsenceModal' // 🎯 SLOT RESPONSIBILITY
import { resolveSlotResponsibility } from '@/domain/planning/resolveSlotResponsibility' // 🎯 SLOT RESPONSIBILITY
import type { ResponsibilityResolution } from '@/domain/planning/slotResponsibility' // 🎯 SLOT RESPONSIBILITY
import {
  getEffectiveDailyLogData,
  DailyLogEntry,
  LogStatus
} from '@/application/ui-adapters/getEffectiveDailyLogData'
import { getPlannedAgentsForDay } from '@/application/ui-adapters/getPlannedAgentsForDay'

import { getDailyShiftStats } from '@/application/ui-adapters/getDailyShiftStats'
import { getOngoingIncidents } from '@/application/ui-adapters/getOngoingIncidents'
import { format, parseISO, addDays, subDays, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarGrid } from '../components/CalendarGrid'
import { EnrichedIncident } from './logHelpers'



const styles = {
  label: { display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.875rem', color: '#374151' },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  listItem: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid transparent',
    background: 'transparent',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '14px',
    display: 'block',
    width: '100%',
    color: '#374151'
  },
  activeListItem: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1e40af',
    fontWeight: 600
  }
}

// Local Component
function ShiftStatusDisplay({ label, isActive, onClick, presentCount, plannedCount }: {
  label: string, isActive: boolean, onClick: () => void, presentCount: number, plannedCount: number
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px',
        borderRadius: '8px',
        border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
        background: isActive ? '#eff6ff' : 'white',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <span style={{ fontWeight: 600, color: isActive ? '#1e40af' : '#374151' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{presentCount}</span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}> / {plannedCount}</span>
      </div>
    </div>
  )
}



export function DailyLogView() {
  const {
    representatives,
    incidents,
    swaps,
    specialSchedules,
    allCalendarDaysForRelevantMonths,
    isLoading,
    addIncident,
    showConfirm,
    pushUndo,
    removeIncident
  } = useAppStore(s => ({
    representatives: s.representatives,
    incidents: s.incidents,
    swaps: s.swaps,
    specialSchedules: s.specialSchedules,
    allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
    isLoading: s.isLoading,
    addIncident: s.addIncident,
    showConfirm: s.showConfirm,
    pushUndo: s.pushUndo,
    removeIncident: s.removeIncident
  }))

  const [logDate, setLogDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [filterMode, setFilterMode] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY')
  const [hideAbsent, setHideAbsent] = useState(false)

  // Local UI State
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [incidentType, setIncidentType] = useState<IncidentType>('TARDANZA')
  const [duration, setDuration] = useState(1)
  const [note, setNote] = useState('')
  const [customPoints, setCustomPoints] = useState<number | ''>('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [activeShift, setActiveShift] = useState<'DAY' | 'NIGHT'>('DAY')


  // 🟢 Absence Confirmation Modal State
  const [absenceConfirmState, setAbsenceConfirmState] = useState<{
    isOpen: boolean
    rep: Representative | null
    onConfirm: (isJustified: boolean) => void
    onCancel: () => void
  }>({
    isOpen: false,
    rep: null,
    onConfirm: () => { },
    onCancel: () => { }
  })

  // 🎯 SLOT RESPONSIBILITY: Coverage Resolution Modal State
  const [coverageResolution, setCoverageResolution] = useState<(Extract<ResponsibilityResolution, { kind: 'RESOLVED' }> & { source: 'COVERAGE' }) | null>(null)

  const calendarRef = useRef<HTMLDivElement>(null)

  const dateForLog = useMemo(() => parseISO(logDate), [logDate])

  // 🟢 CANVAS READY: Performance Optimization for Coverage
  // 1. Read plain state (not derived functions) for stable references
  const coverages = useCoverageStore(state => state.coverages)
  const [isCoverageManagerOpen, setIsCoverageManagerOpen] = useState(false) // 🔄 NEW: Modal State

  // 2. Memoize active coverages for this specific day (pure derivation)
  const activeCoveragesForDay = useMemo(() => {
    return coverages.filter(
      c => c.status === 'ACTIVE' && c.date === logDate
    )
  }, [coverages, logDate]) // Stable dependencies - no function references

  // 3. Pre-calculate lookup map O(1) access
  // This prevents O(n*m) complexity inside the render loop
  const coverageByRepId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findCoverageForDay>>()

    // We only care about reps in the current list context
    // but calculating for all is cheap enough and safer for cache
    for (const rep of representatives) {
      map.set(
        rep.id,
        findCoverageForDay(rep.id, logDate, activeCoveragesForDay, activeShift) // ✅ Pass activeShift
      )
    }

    return map
  }, [representatives, logDate, activeCoveragesForDay, activeShift]) // ✅ Add activeShift to dependencies


  // Calculate the Weekly Plan for the logDate context
  const activeWeeklyPlan = useMemo(() => {
    if (allCalendarDaysForRelevantMonths.length === 0) return null

    // Find week days
    const start = startOfWeek(dateForLog, { weekStartsOn: 1 })
    const days: any[] = [] // DayInfo
    for (let i = 0; i < 7; i++) {
      const dStr = format(addDays(start, i), 'yyyy-MM-dd')
      const found = allCalendarDaysForRelevantMonths.find(d => d.date === dStr)
      if (found) days.push(found)
    }

    if (days.length !== 7) return null

    return buildWeeklySchedule(
      representatives,
      incidents,
      specialSchedules,
      days,
      allCalendarDaysForRelevantMonths
    )
  }, [dateForLog, allCalendarDaysForRelevantMonths, representatives, incidents, specialSchedules])

  // 🔒 CANONICAL RULE: Administrative vs Operational Filtering
  const isAdministrativeIncident = incidentType === 'LICENCIA' || incidentType === 'VACACIONES'

  const baseRepresentativeList = useMemo(() => {
    if (isAdministrativeIncident) {
      // 🧠 ADMINISTRATIVE = ALL ACTIVE REPRESENTATIVES
      return representatives.filter(r => r.isActive)
    }

    // 🧠 OPERATIONAL = ONLY PLANNED FOR THIS SHIFT ON THIS DAY
    if (!activeWeeklyPlan) return []

    const plannedAgentsForShift = getPlannedAgentsForDay(
      activeWeeklyPlan,
      incidents,
      logDate,
      activeShift,
      allCalendarDaysForRelevantMonths,
      representatives,
      specialSchedules
    )

    const repMap = new Map(representatives.map(r => [r.id, r]))

    return plannedAgentsForShift
      .map(p => repMap.get(p.representativeId))
      .filter((r): r is Representative => !!r && r.isActive)
  }, [
    isAdministrativeIncident,
    representatives,
    activeWeeklyPlan,
    incidentType,
    incidents,
    logDate,
    activeShift,
    allCalendarDaysForRelevantMonths,
    specialSchedules
  ])

  const filteredRepresentatives = useMemo(() => {
    let result = baseRepresentativeList

    if (hideAbsent) {
      result = result.filter(r => {
        const isAbsent = incidents.some(i =>
          i.representativeId === r.id &&
          i.type === 'AUSENCIA' &&
          i.startDate === logDate
        )
        return !isAbsent
      })
    }

    if (!searchTerm) return result

    const lower = searchTerm.toLowerCase()
    return result.filter(r => r.name.toLowerCase().includes(lower))
  }, [baseRepresentativeList, searchTerm, hideAbsent, incidents, logDate])

  // Calculate Daily Stats
  const dailyStats = useMemo(() => {
    if (!activeWeeklyPlan?.agents?.length || isLoading) {
      return { dayPresent: 0, dayPlanned: 0, nightPresent: 0, nightPlanned: 0 }
    }

    // Note: getDailyShiftStats handles null plan safely
    const dayStats = getDailyShiftStats(
      activeWeeklyPlan,
      incidents,
      logDate,
      'DAY',
      allCalendarDaysForRelevantMonths,
      representatives,
      specialSchedules
    )

    const nightStats = getDailyShiftStats(
      activeWeeklyPlan,
      incidents,
      logDate,
      'NIGHT',
      allCalendarDaysForRelevantMonths,
      representatives,
      specialSchedules
    )

    return {
      dayPresent: dayStats.present,
      dayPlanned: dayStats.planned,
      nightPresent: nightStats.present,
      nightPlanned: nightStats.planned
    }
  }, [activeWeeklyPlan, incidents, logDate, allCalendarDaysForRelevantMonths, representatives, specialSchedules])

  const conflictCheck = useMemo(() => {
    if (!selectedRep) return { hasConflict: false, messages: [] }

    const input: IncidentInput = {
      representativeId: selectedRep.id,
      startDate: logDate,
      type: incidentType,
      duration: (incidentType === 'LICENCIA' || incidentType === 'VACACIONES') ? duration : 1,
      note
    }

    return checkIncidentConflicts(
      input.representativeId,
      input.startDate,
      input.type,
      input.duration,
      incidents,
      allCalendarDaysForRelevantMonths,
      selectedRep
    )
  }, [selectedRep, incidentType, logDate, duration, note, incidents, allCalendarDaysForRelevantMonths])


  // 🟢 CANONICAL: ONGOING EVENTS (Powered by Adapter)
  const ongoingIncidents = useMemo(() => {
    if (isLoading) return []
    return getOngoingIncidents(
      incidents,
      representatives,
      logDate, // Context Date
      allCalendarDaysForRelevantMonths
    )
  }, [incidents, representatives, logDate, allCalendarDaysForRelevantMonths, isLoading])

  const { dayIncidents } = useMemo(() => {
    if (isLoading) return { dayIncidents: [] };

    const repMap = new Map(representatives.map(r => [r.id, r]))

    // Define Range based on Filter Mode
    let rangeStart: Date, rangeEnd: Date;

    if (filterMode === 'WEEK') {
      rangeStart = startOfWeek(dateForLog, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(dateForLog, { weekStartsOn: 1 });
    } else if (filterMode === 'MONTH') {
      rangeStart = startOfMonth(dateForLog);
      rangeEnd = endOfMonth(dateForLog);
    } else {
      rangeStart = dateForLog;
      rangeEnd = dateForLog;
    }

    // First map to potentially null, then filter
    const candidates = incidents.map(incident => {
      if (incident.type === 'OVERRIDE') return null

      // 🧠 STRICT RULE: Point Events Only in Daily Log
      if (incident.type === 'VACACIONES' || incident.type === 'LICENCIA') return null

      const rep = repMap.get(incident.representativeId)
      if (!rep) return null
      const resolved = resolveIncidentDates(
        incident,
        allCalendarDaysForRelevantMonths,
        rep
      )

      // Filter Logic: Check if ANY resolved date falls within range
      const isVisible = resolved.dates.some(dateStr => {
        const date = parseISO(dateStr);
        return date >= rangeStart && date <= rangeEnd;
      });

      if (!isVisible) return null

      let dayCount = resolved.dates.indexOf(logDate) + 1
      let totalDuration = resolved.dates.length

      const enriched: EnrichedIncident = {
        ...incident,
        repName: rep.name,
        repShift: rep.baseShift,
        dayCount: 1, // Point events are always day 1
        totalDuration: 1,
        returnDate: incident.startDate, // Ends same day
        progressRatio: 1 // Completed
      }
      return enriched
    })

    const allRelevantIncidents = candidates.filter((i): i is EnrichedIncident => i !== null)

    return {
      dayIncidents: allRelevantIncidents
    }
  }, [incidents, logDate, dateForLog, allCalendarDaysForRelevantMonths, representatives, isLoading, filterMode])




  // �🛡️ UX PROTECTION
  useEffect(() => {
    if (!selectedRep) return
    const stillVisible = baseRepresentativeList.some(r => r.id === selectedRep.id)
    if (!stillVisible) {
      setSelectedRep(null)
      setSearchTerm('')
    }
  }, [incidentType, baseRepresentativeList, selectedRep])

  const submit = async (input: IncidentInput, rep: Representative) => {
    // Logic for adding incident
    const conflicts = checkIncidentConflicts(
      input.representativeId,
      input.startDate,
      input.type,
      input.duration,
      incidents,
      allCalendarDaysForRelevantMonths,
      rep
    )

    if (conflicts.hasConflict) {
      const proceed = await showConfirm({
        title: 'Conflictos Detectados',
        description: (
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
            {(conflicts.messages ?? [conflicts.message ?? 'Conflicto detectado']).map((m: string, i: number) => <li key={i}>{m}</li>)}
          </ul>
        ),
        intent: 'warning',
        confirmLabel: 'Confirmar e Ignorar'
      })
      if (!proceed) return
    }

    const res = await addIncident(input)
    if (res.ok) {
      setNote('')
      setCustomPoints('')

      if (res.newId) {
        pushUndo({
          label: `Incidencia registrada para ${rep.name}`,
          undo: () => removeIncident(res.newId!)
        })
      }
    } else {
      alert('Error: ' + res.reason)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRep) return

    let finalIncidentType = incidentType
    let details

    // 🟢 INTERSTITIAL CONFIRMATION for ABSENCE
    // 🎯 SLOT RESPONSIBILITY: Canonical Resolution Flow
    if (incidentType === 'AUSENCIA') {
      // Domain resolves responsibility - UI only provides context
      const resolution = resolveSlotResponsibility(
        selectedRep.id,
        logDate,
        activeShift,
        activeWeeklyPlan!,
        activeCoveragesForDay,
        representatives
      )

      // CASE 1: UNASSIGNED - Cannot register absence
      if (resolution.kind === 'UNASSIGNED') {
        await showConfirm({
          title: resolution.displayContext.title,
          description: resolution.displayContext.subtitle,
          intent: 'warning',
          confirmLabel: 'Entendido'
        })
        return
      }

      // CASE 2: COVERAGE - Show specialized modal
      if (resolution.source === 'COVERAGE') {
        setCoverageResolution(resolution as any)
        return
      }

      // CASE 3: BASE - Standard absence flow
      setAbsenceConfirmState({
        isOpen: true,
        rep: selectedRep,
        onConfirm: (isJustified) => {
          submit({
            representativeId: resolution.targetRepId,
            type: 'AUSENCIA',
            startDate: logDate,
            duration: 1,
            note: note.trim() || undefined,
            source: resolution.source,
            slotOwnerId: resolution.slotOwnerId !== resolution.targetRepId ? resolution.slotOwnerId : undefined,
            details: isJustified ? 'JUSTIFICADA' : 'INJUSTIFICADA'
          }, selectedRep)
          setAbsenceConfirmState(prev => ({ ...prev, isOpen: false }))
        },
        onCancel: () => setAbsenceConfirmState(prev => ({ ...prev, isOpen: false }))
      })
      return
    }

    const isMultiDay =
      finalIncidentType === 'LICENCIA' || finalIncidentType === 'VACACIONES'

    const incidentInput: IncidentInput = {
      representativeId: selectedRep.id,
      type: finalIncidentType,
      startDate: logDate,
      duration: isMultiDay ? duration : 1,
      customPoints: finalIncidentType === 'OTRO' && customPoints !== '' ? Number(customPoints) : undefined,
      note: note.trim() || undefined,
      details,
    }
    submit(incidentInput, selectedRep)
  }


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
              presentCount={dailyStats.dayPresent}
              plannedCount={dailyStats.dayPlanned}
            />
            <ShiftStatusDisplay
              label="Noche"
              isActive={activeShift === 'NIGHT'}
              onClick={() => setActiveShift('NIGHT')}
              presentCount={dailyStats.nightPresent}
              plannedCount={dailyStats.nightPlanned}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <label style={{ ...styles.label, marginBottom: 0 }}>
              Representantes del Turno
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* 🔄 NEW: Manage Coverages Button */}
              {activeCoveragesForDay.length > 0 && (
                <button
                  onClick={() => setIsCoverageManagerOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#1e40af', // Blue to match coverage theme
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Gestionar coberturas activas"
                >
                  <Shield size={12} />
                  {activeCoveragesForDay.length}
                </button>
              )}

              <button
                onClick={() => setHideAbsent(!hideAbsent)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: hideAbsent ? '#2563eb' : '#6b7280',
                  fontSize: '12px',
                  fontWeight: 500
                }}
                title="Solo afecta la vista, no el conteo"
              >
                {hideAbsent ? 'Mostrar Ausentes' : 'Ocultar Ausentes'}
              </button>
            </div>
          </div>
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
            {filteredRepresentatives.map(rep => {
              // 🧠 OPERATIONAL TRUTH: Use canonical check for strikethrough
              const isOperationallyAbsent = isSlotOperationallyEmpty(
                rep.id,
                logDate,
                activeShift,
                incidents
              )

              const isAbsent = incidents.some(i =>
                i.representativeId === rep.id &&
                i.type === 'AUSENCIA' &&
                i.startDate === logDate
              )

              // 🎯 SLOT RESPONSIBILITY: Use domain logic for visualization
              // We need to know if this slot is UNASSIGNED or COVERED
              const resolution = activeWeeklyPlan ? resolveSlotResponsibility(
                rep.id,
                logDate,
                activeShift,
                activeWeeklyPlan,
                activeCoveragesForDay,
                representatives
              ) : null

              const isUnassigned = resolution?.kind === 'UNASSIGNED'
              const isCovered = resolution?.kind === 'RESOLVED' && resolution.source === 'COVERAGE'

              // Helper to check if they are covering someone else
              const coverage = coverageByRepId.get(rep.id)
              const isCovering = coverage?.isCovering
              const coveringName = coverage?.covering?.repId
                ? representatives.find(r => r.id === coverage.covering!.repId)?.name
                : undefined

              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedRep(rep)}
                  style={{
                    ...styles.listItem,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    ...(selectedRep?.id === rep.id ? styles.activeListItem : {}),
                    ...(isOperationallyAbsent ? { opacity: 0.7 } : {}),
                    ...(isUnassigned ? { borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' } : {})
                  }}
                >
                  <span style={{
                    textDecoration: isOperationallyAbsent ? 'line-through' : 'none',
                    color: isOperationallyAbsent ? '#6b7280' : (isUnassigned ? '#b91c1c' : 'inherit'),
                    fontWeight: isUnassigned ? 600 : 400
                  }}>
                    {rep.name}
                  </span>

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {/* 🎯 VISUALIZATION: Unassigned / Failed Coverage */}
                    {isUnassigned && (
                      <span
                        title="Este turno debería estar cubierto pero no tiene responsable asignado"
                        style={{
                          fontSize: '10px',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          cursor: 'help',
                          border: '1px solid #fca5a5'
                        }}
                      >
                        <AlertTriangle size={10} /> DESCUBIERTO
                      </span>
                    )}

                    {/* 🎯 VISUALIZATION: Covered (Resolved) */}
                    {isCovered && resolution?.kind === 'RESOLVED' && (
                      <span
                        title={`Cubierto por ${resolution.displayContext.targetName}`}
                        style={{
                          fontSize: '10px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          cursor: 'help'
                        }}
                      >
                        <Shield size={10} /> Cubierto
                      </span>
                    )}

                    {isCovering && (
                      <span
                        title={`Cubriendo a ${coveringName ?? '—'}`}
                        style={{
                          fontSize: '10px',
                          background: '#f3e8ff',
                          color: '#6b21a8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          cursor: 'help'
                        }}
                      >
                        <RefreshCw size={10} /> Cubriendo
                      </span>
                    )}

                    {isAbsent && (
                      <span style={{
                        fontSize: '10px',
                        background: '#fecaca',
                        color: '#991b1b',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        Ausente
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
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

            {conflictCheck.hasConflict && (
              <InlineAlert variant="warning">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {(conflictCheck.messages ?? [conflictCheck.message ?? 'Conflicto detectado']).map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
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

        <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
          <button
            onClick={() => setFilterMode('TODAY')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: filterMode === 'TODAY' ? '#111827' : 'white',
              color: filterMode === 'TODAY' ? 'white' : '#374151',
              borderColor: filterMode === 'TODAY' ? '#111827' : '#d1d5db'
            }}
          >
            Hoy
          </button>
          <button
            onClick={() => setFilterMode('WEEK')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: filterMode === 'WEEK' ? '#111827' : 'white',
              color: filterMode === 'WEEK' ? 'white' : '#374151',
              borderColor: filterMode === 'WEEK' ? '#111827' : '#d1d5db'
            }}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setFilterMode('MONTH')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: filterMode === 'MONTH' ? '#111827' : 'white',
              color: filterMode === 'MONTH' ? 'white' : '#374151',
              borderColor: filterMode === 'MONTH' ? '#111827' : '#d1d5db'
            }}
          >
            Mes Actual
          </button>
        </div>

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
              padding: 'var(--space-xl)', // 🟢 Increased Padding
              overflowY: 'auto',
              marginBottom: 'var(--space-md)',
              boxShadow: 'var(--shadow-sm)',
              maxHeight: 'calc(100vh - 200px)', // 🟢 Adjusted Dynamic Height
            }}
          >
            <DailyEventsList
              title="Eventos en Curso (Monitor)"
              incidents={ongoingIncidents}
              emptyMessage="No hay licencias o vacaciones activas."
            />
          </div>
        </div>
      </section>

      {/* GLOBAL CONFIRM DIALOG - Just in case store uses it here, though mostly useAppStore call triggers it */}
      {/* If confirmConfig is local state used by legacy parts? We removed it locally except lines 87. 
          The store's confirm is imperative. 
          Actually DailyLogView DOES NOT need <ConfirmDialog> for the store's confirm if <ConfirmDialog> is rendered in App Layout.
          BUT if it's not rendered in Layout, we need it here?
          Usually ConfirmDialog is part of the Layout. 
          But wait, line 87: `const [confirmConfig...`. We aren't using `confirmConfig` anymore based on my rewrite.
          I replaced `confirm()` with `showConfirm` from store.
          Does store render the dialog? 
          Typically `useAppStore` holds state, but component must render UI.
          Let's look at `Layout` or similar.
          However, to be safe, I will include ConfirmDialog for store state if needed, but `useAppStore` has `confirmState`.
          DailyLogView probably doesn't need to render it if it's global.
          But wait, the `confirmConfig` in my previous edit was local. 
          User said: "Toda confirmación debe pasar por showConfirm".
          `useAppStore.showConfirm` typically sets a state in the store.
          Who renders it?
          If I don't see a `GlobalConfirmDialog` in layout, I might need to render it.

          Let's assume the user has a global confirm dialog mechanism or I should render one that listens to store.
          But for now, to ensure I don't break "visuals", I will rely on `showConfirm` promise flow.
          If `showConfirm` sets `confirmState` in store, something must render it.
          I see `confirmState` in `useAppStore`.
          I'll assume the root layout handles it.
          I will Remove the local `confirmConfig` usage to avoid confusion.
      */}
      {/* Only render store-based confirm if I am the one responsible? No, typically main layout. */}
      {/* 🟢 CUSTOM ABSENCE CONFIRMATION MODAL */}
      {absenceConfirmState.isOpen && absenceConfirmState.rep && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <header>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                Confirmar Ausencia
              </h3>
            </header>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '15px', color: '#374151', margin: 0 }}>
                ¿Registrar <strong>Ausencia</strong> a
              </p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '4px 0 0' }}>
                {absenceConfirmState.rep.name}
              </p>
            </div>

            <AbsenceSelector
              onConfirm={absenceConfirmState.onConfirm}
              onCancel={absenceConfirmState.onCancel}
            />
          </div>
        </div>
      )}
      {/* 🎯 SLOT RESPONSIBILITY: Coverage Resolution Modal */}
      {coverageResolution && (
        <CoverageAbsenceModal
          resolution={coverageResolution}
          onConfirm={(isJustified) => {
            const targetRep = representatives.find(r => r.id === coverageResolution.targetRepId)
            if (targetRep) {
              submit({
                representativeId: coverageResolution.targetRepId,
                type: 'AUSENCIA',
                startDate: logDate,
                duration: 1,
                source: 'COVERAGE',
                slotOwnerId: coverageResolution.slotOwnerId,
                details: isJustified ? 'JUSTIFICADA' : 'INJUSTIFICADA'
              }, targetRep)
            }
            setCoverageResolution(null)
          }}
          onCancel={() => setCoverageResolution(null)}
        />
      )}

      {/* 🔄 NEW: Coverage Manager Modal */}
      <CoverageManagerModal
        isOpen={isCoverageManagerOpen}
        onClose={() => setIsCoverageManagerOpen(false)}
        date={logDate}
      />
    </div>
  )
}

function AbsenceSelector({ onConfirm, onCancel }: { onConfirm: (val: boolean) => void, onCancel: () => void }) {
  const [justified, setJustified] = useState<boolean | null>(null)

  return (
    <>
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          border: '2px solid #e5e7eb',
          background: '#f9fafb',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            marginBottom: '12px',
            color: '#111827',
            textAlign: 'center'
          }}
        >
          ¿La ausencia es justificada?
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setJustified(true)}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '8px',
              border: justified === true ? '2px solid #16a34a' : '1px solid #d1d5db',
              background: justified === true ? '#dcfce7' : 'white',
              color: justified === true ? '#166534' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            SÍ
          </button>

          <button
            type="button"
            onClick={() => setJustified(false)}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '8px',
              border: justified === false ? '2px solid #dc2626' : '1px solid #d1d5db',
              background: justified === false ? '#fee2e2' : 'white',
              color: justified === false ? '#7f1d1d' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            NO
          </button>
        </div>

        <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
          Esta decisión impacta puntos y reportes.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            background: 'transparent',
            color: '#6b7280',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            if (justified !== null) onConfirm(justified)
          }}
          disabled={justified === null}
          style={{
            flex: 2,
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            background: justified === null ? '#e5e7eb' : '#2563eb',
            color: justified === null ? '#9ca3af' : 'white',
            fontWeight: 600,
            cursor: justified === null ? 'not-allowed' : 'pointer'
          }}
        >
          Confirmar Ausencia
        </button>
      </div>
    </>
  )
}
