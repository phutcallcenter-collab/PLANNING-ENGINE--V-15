/**
 * ⚠️ HARDENED VIEW - PLANNING SECTION
 *
 * This is the main container for the weekly planning grid and its associated
 * controls and panels. Its primary responsibilities are:
 * - Managing the active view state (e.g., 'DAY' or 'NIGHT' shift).
 * - Orchestrating user interactions (navigation, modal triggers, overrides).
 * - Consuming domain hooks (`useWeeklyPlan`, `useCoverage`) and passing the
 *   derived state down to presentational components.
 * - Enforcing the contract of "existence" vs. "state" by correctly filtering
 *   the representatives list for the view.
 */
'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { PlanView } from './PlanView'
import {
  DayInfo,
  CoverageRule,
  ShiftType,
  ISODate,
  IncidentInput,
  ResolvedCoverage,
  Representative,
  ShiftAssignment,
  WeeklyPresence,
  Incident,
  SwapEvent,
} from '../../domain/types'
import { CalendarDayModal } from './CalendarDayModal'
import { SwapModal } from './SwapModal'
import { CoverageRulesPanel } from '../coverage/CoverageRulesPanel'
import { CoverageDetailModal } from '@/components/coverage/CoverageDetailModal' // ✅ NEW
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useCoverageStore } from '@/store/useCoverageStore' // ✅ NEW
import { useWeeklyPlan } from '../../hooks/useWeeklyPlan'

import { useWeekNavigator } from '@/hooks/useWeekNavigator'
import { useEditMode } from '@/hooks/useEditMode'
import { resolveCoverage } from '@/domain/planning/resolveCoverage'
import { CoverageChart } from '../coverage/CoverageChart'
import { getEffectiveAssignmentsForPlanner } from '@/application/ui-adapters/getEffectiveAssignmentsForPlanner'
import {
  getEffectiveDailyCoverage,
  EffectiveCoverageResult,
} from '@/application/ui-adapters/getEffectiveDailyCoverage'
import * as humanize from '@/application/presenters/humanize'
import { format, parseISO } from 'date-fns'
import { HelpPanel } from '../components/HelpPanel'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { PromptDialog } from '../components/PromptDialog'

import { belongsToShiftThisWeek } from './belongsToShiftThisWeek'

export function PlanningSection({ onNavigateToSettings }: { onNavigateToSettings: () => void }) {
  const {
    representatives,
    coverageRules,
    planningAnchorDate,
    isLoading,
    addOrUpdateSpecialDay,
    removeSpecialDay,
    setPlanningAnchorDate,
    incidents,
    swaps,
    addIncident,
    showMixedShiftConfirmModal,
    allCalendarDaysForRelevantMonths,
    pushUndo,
    specialSchedules,
  } = useAppStore(s => ({
    representatives: s.representatives ?? [],
    coverageRules: s.coverageRules,
    planningAnchorDate: s.planningAnchorDate,
    isLoading: s.isLoading,
    addOrUpdateSpecialDay: s.addOrUpdateSpecialDay,
    removeSpecialDay: s.removeSpecialDay,
    setPlanningAnchorDate: s.setPlanningAnchorDate,
    incidents: s.incidents,
    addIncident: s.addIncident,
    showMixedShiftConfirmModal: s.showMixedShiftConfirmModal,
    swaps: s.swaps,
    allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
    pushUndo: s.pushUndo,
    specialSchedules: s.specialSchedules,
  }))

  const activeRepresentatives = useMemo(
    () => representatives.filter(rep => rep.isActive !== false),
    [representatives]
  )

  const { mode } = useEditMode()

  // --- TIME SOVEREIGN ---
  const {
    weekDays,
    label: weekLabel,
    isCurrentWeek,
    handlePrevWeek,
    handleNextWeek,
    handleGoToday,
  } = useWeekNavigator(planningAnchorDate, setPlanningAnchorDate)
  // --- END TIME SOVEREIGN ---

  const { weeklyPlan } = useWeeklyPlan(weekDays) // Consumes weekDays

  const [activeShift, setActiveShift] = useState<ShiftType>('DAY')
  const [editingDay, setEditingDay] = useState<DayInfo | null>(null)
  // Coverage rule editing is now handled in Settings > Demand
  const [swapModalState, setSwapModalState] = useState<{
    isOpen: boolean
    repId: string | null
    date: ISODate | null
    shift: ShiftType | null
    existingSwap: SwapEvent | null
  }>({ isOpen: false, repId: null, date: null, shift: null, existingSwap: null })

  // ✅ NEW: Coverage detail modal state
  const [coverageDetailState, setCoverageDetailState] = useState<{
    isOpen: boolean
    coverageId: string | null
  }>({ isOpen: false, coverageId: null })

  const { showConfirm } = useAppStore(s => ({
    showConfirm: s.showConfirm,
  }))

  // 📝 PROMPT DIALOG STATE
  const [promptConfig, setPromptConfig] = useState<{
    open: boolean
    title: string
    description: string
    placeholder?: string
    optional?: boolean
    resolve: (value: string | undefined) => void
  } | null>(null)

  const showConfirmWithInput = (options: {
    title: string
    description: string
    placeholder?: string
    optional?: boolean
  }): Promise<string | undefined> => {
    return new Promise((resolve) => {
      setPromptConfig({
        open: true,
        ...options,
        resolve: (val) => {
          setPromptConfig(null)
          resolve(val)
        },
      })
    })
  }

  const togglePlanOverride = async (
    representativeId: string,
    date: ISODate
  ) => {
    if (!weeklyPlan) return
    const rep = representatives.find(r => r.id === representativeId)
    if (!rep) return

    // 🔒 VALIDATION: Block overrides during vacation/license periods
    // Check if there's an active VACACIONES or LICENCIA incident for this representative
    const blockingIncident = incidents.find(i => {
      if (i.representativeId !== representativeId) return false
      if (!['VACACIONES', 'LICENCIA'].includes(i.type)) return false

      const resolved = resolveIncidentDates(i, allCalendarDaysForRelevantMonths, rep)

      // Check if date is within the vacation range (including return date)
      // We block from start until the day BEFORE return (returnDate is first working day)
      if (resolved.start && resolved.returnDate) {
        return date >= resolved.start && date < resolved.returnDate
      }

      return false
    })

    if (blockingIncident) {
      // Silently ignore the click - the cell should appear disabled
      return
    }

    const agentPlan = weeklyPlan.agents.find(
      a => a.representativeId === representativeId
    )
    const dayPresence = agentPlan?.days[date]

    const existingOverride = incidents.find(
      i =>
        i.representativeId === representativeId &&
        i.startDate === date &&
        i.type === 'OVERRIDE'
    ) as (Incident & { previousAssignment?: ShiftAssignment }) | undefined

    if (existingOverride) {
      // This is removing an existing override.
      // The `undo` action will restore it by re-adding the original `existingOverride` object.
      useAppStore.setState(state => {
        state.incidents = state.incidents.filter(i => i.id !== existingOverride.id)

        state.swaps = state.swaps.filter(swap => {
          if (swap.date !== date) return true;
          return !(
            ('representativeId' in swap && swap.representativeId === representativeId) ||
            ('fromRepresentativeId' in swap && swap.fromRepresentativeId === representativeId) ||
            ('toRepresentativeId' in swap && swap.toRepresentativeId === representativeId)
          );
        });

      })
      pushUndo({
        label: `Reaplicar cambio de turno de ${rep.name}`,
        undo: () => {
          useAppStore.setState(state => {
            state.incidents.push(existingOverride);
          })
        },
      })
      return
    }

    // Creating a new override
    const previousAssignment = dayPresence?.assignment ?? { type: 'NONE' }
    let finalAssignment: ShiftAssignment | null

    if (previousAssignment?.type === 'BOTH') {
      finalAssignment = await showMixedShiftConfirmModal(
        representativeId,
        date,
        activeShift
      )
      if (finalAssignment === null) return
    } else {
      const isCurrentlyWorking =
        previousAssignment.type === 'SINGLE' &&
        previousAssignment.shift === activeShift
      finalAssignment = isCurrentlyWorking
        ? { type: 'NONE' }
        : { type: 'SINGLE', shift: activeShift }
    }

    // 📝 CONTEXT: Ask for explanation logic
    const requiresExplanation =
      previousAssignment?.type !== finalAssignment?.type ||
      (previousAssignment?.type === 'SINGLE' &&
        finalAssignment?.type === 'SINGLE' &&
        previousAssignment.shift !== finalAssignment.shift)

    let note: string | undefined

    if (requiresExplanation) {
      const result = await showConfirmWithInput({
        title: 'Cambio de día libre',
        description: '¿Por qué se realiza este cambio?',
        placeholder: 'Ej: Permiso especial, cita médica, etc.',
        optional: true,
      })
      if (result === undefined) return // User cancelled
      // Sanitization: Empty strings become undefined
      note = result.trim() || undefined
    }

    const incidentInput: IncidentInput = {
      representativeId,
      startDate: date,
      type: 'OVERRIDE',
      duration: 1,
      assignment: finalAssignment,
      previousAssignment,
      note,
    }

    // Since we're not confirming, we add the incident directly.
    const result = await addIncident(incidentInput, true); // pass true to skip confirmation

    if (result.ok) {
      pushUndo({
        label: `Deshacer cambio de turno de ${rep.name}`,
        undo: () => {
          useAppStore.setState(state => {
            state.incidents = state.incidents.filter(i => i.id !== result.newId);

            state.swaps = state.swaps.filter(swap => {
              if (swap.date !== date) return true;
              const repInvolved =
                ('representativeId' in swap && swap.representativeId === representativeId) ||
                ('fromRepresentativeId' in swap && swap.fromRepresentativeId === representativeId) ||
                ('toRepresentativeId' in swap && swap.toRepresentativeId === representativeId);
              return !repInvolved;
            });
          });
        },
      })
    }
  }

  const handleCellContextMenu = (
    repId: string,
    date: ISODate,
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    // ✅ NEW: Check if this cell has a coverage badge
    const agentPlan = weeklyPlan?.agents.find(a => a.representativeId === repId)
    const dayData = agentPlan?.days[date]
    const badge = dayData?.badge

    if (badge === 'CUBIERTO' || badge === 'CUBRIENDO') {
      // Find the coverage ID for this cell
      const { getActiveCoverages } = useCoverageStore.getState()
      const activeCoverages = getActiveCoverages()

      const coverage = activeCoverages.find(c => {
        if (c.date !== date || c.shift !== activeShift) return false

        // If badge is CUBIERTO, this person is being covered
        if (badge === 'CUBIERTO') {
          return c.coveredRepId === repId
        }

        // If badge is CUBRIENDO, this person is covering
        if (badge === 'CUBRIENDO') {
          return c.coveringRepId === repId
        }

        return false
      })

      if (coverage) {
        // Show coverage detail modal instead of swap modal
        setCoverageDetailState({
          isOpen: true,
          coverageId: coverage.id
        })
        return
      }
    }

    // Normal flow: check for existing swap and show swap modal
    const existingSwap = swaps.find(swap => {
      if (swap.date !== date) return false;
      if (swap.type === 'COVER') {
        return (swap.fromRepresentativeId === repId || swap.toRepresentativeId === repId) && swap.shift === activeShift;
      }
      if (swap.type === 'DOUBLE') {
        return swap.representativeId === repId && swap.shift === activeShift;
      }
      if (swap.type === 'SWAP') {
        return swap.fromRepresentativeId === repId || swap.toRepresentativeId === repId;
      }
      return false;
    });

    setSwapModalState({
      isOpen: true,
      repId,
      date,
      shift: activeShift,
      existingSwap: existingSwap || null,
    });
  };

  const assignmentsMap = useMemo(() => {
    if (!weeklyPlan) return {}
    return getEffectiveAssignmentsForPlanner(
      weeklyPlan,
      swaps,
      incidents,
      allCalendarDaysForRelevantMonths,
      representatives,
      specialSchedules
    )
  }, [
    weeklyPlan,
    swaps,
    incidents,
    allCalendarDaysForRelevantMonths,
    representatives,
    specialSchedules,
  ])

  const agentsToRender = useMemo(() => {
    if (!weeklyPlan) return []

    const planMap = new Map(
      weeklyPlan.agents.map(a => [a.representativeId, a])
    )

    return activeRepresentatives.filter(rep => {
      const agentPlan = planMap.get(rep.id)
      if (!agentPlan) return false

      return belongsToShiftThisWeek(
        agentPlan,
        weekDays,
        activeShift,
        rep,
        specialSchedules
      )
    })
  }, [weeklyPlan, weekDays, activeShift, activeRepresentatives, specialSchedules])

  const coverageData = useMemo(() => {
    if (!weeklyPlan) return {}
    const data: Record<ISODate, EffectiveCoverageResult> = {}

    weekDays.forEach(day => {
      const result = getEffectiveDailyCoverage(
        weeklyPlan,
        swaps,
        coverageRules,
        day.date,
        incidents,
        allCalendarDaysForRelevantMonths,
        representatives,
        specialSchedules
      )
      data[day.date] = result[activeShift]
    })
    return data
  }, [weeklyPlan, swaps, coverageRules, weekDays, activeShift, incidents, specialSchedules])

  const hasAnyCoverageRule = useMemo(() => {
    return Object.values(coverageData).some(d => d.required > 0)
  }, [coverageData])

  const shiftTabStyle = (isActive: boolean) => ({
    padding: 'var(--space-sm) var(--space-md)',
    cursor: 'pointer',
    border: 'none',
    borderBottom: isActive
      ? '2px solid var(--text-main)'
      : '2px solid transparent',
    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
    fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
    background: 'transparent',
    fontSize: 'var(--font-size-md)',
    marginRight: '10px',
  })

  if (isLoading || !weekDays || weekDays.length === 0) {
    return (
      <div style={{ padding: 'var(--space-xl)', fontFamily: 'sans-serif', color: 'var(--text-muted)' }}>
        Cargando planificación...
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100vh', padding: 'var(--space-lg)' }}>
      <div
        style={{
          marginBottom: 'var(--space-lg)',
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: `1px solid ${mode === 'ADMIN_OVERRIDE' ? '#f59e0b' : 'var(--border-subtle)'
            }`,
          height: '74px',
          boxSizing: 'border-box',
          transition: 'border-color 0.3s ease',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <h2 style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-main)' }}>
              Planificación
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                padding: '2px 8px',
                borderRadius: '99px',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)'
              }}>
                {activeShift === 'DAY' ? '🌞 Turno Día' : '🌙 Turno Noche'}
              </span>
            </h2>
            <HelpPanel
              title="¿Cómo usar el planner?"
              points={[
                'Click en una celda para cambiar el turno del agente',
                'Click derecho para gestionar swaps y coberturas',
                'El gráfico lateral muestra la cobertura requerida vs actual',
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>

            {!isCurrentWeek && (
              <button
                onClick={handleGoToday}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                Hoy
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', background: 'var(--bg-surface)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <button
                onClick={handlePrevWeek}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                &lt;
              </button>
              <div
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-main)',
                  width: '220px',
                  textAlign: 'center',
                }}
              >
                {weekLabel}
              </div>
              <button
                onClick={handleNextWeek}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <button
              style={shiftTabStyle(activeShift === 'DAY')}
              onClick={() => setActiveShift('DAY')}
            >
              Turno Día
            </button>
            <button
              style={shiftTabStyle(activeShift === 'NIGHT')}
              onClick={() => setActiveShift('NIGHT')}
            >
              Turno Noche
            </button>
          </div>
          <button
            onClick={() =>
              setSwapModalState({
                isOpen: true,
                repId: null,
                date: planningAnchorDate,
                shift: activeShift,
                existingSwap: null,
              })
            }
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--font-size-base)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Gestionar Cambios
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={weeklyPlan ? weeklyPlan.weekStart + activeShift : activeShift}
          initial={{
            opacity: 0,
          }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {weeklyPlan ? (
            <div
              style={{
                display: 'flex',
                overflowX: 'hidden', // Containment
                gap: 'var(--space-xl)',
                alignItems: 'start',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <PlanView
                  weeklyPlan={weeklyPlan}
                  weekDays={weekDays}
                  agents={agentsToRender}
                  activeShift={activeShift}
                  assignmentsMap={assignmentsMap}
                  onCellClick={(repId, date) => togglePlanOverride(repId, date)}
                  onCellContextMenu={handleCellContextMenu}
                  onEditDay={setEditingDay}
                />
              </div>

              <aside style={{ position: 'sticky', top: '20px', width: '340px', flexShrink: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-lg)',
                  }}
                >
                  {hasAnyCoverageRule ? (
                    <CoverageChart data={coverageData} />
                  ) : (
                    /* Empty state handled now by Matrix in Settings */
                    <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-strong)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                      Sin reglas de cobertura activas.
                    </div>
                  )}

                  <CoverageRulesPanel
                    onNavigateToSettings={onNavigateToSettings}
                  />
                </div>
              </aside>
            </div>
          ) : (
            <div>Cargando plan...</div>
          )}
        </motion.div>
      </AnimatePresence>

      {editingDay && (
        <CalendarDayModal
          day={editingDay}
          onClose={() => setEditingDay(null)}
          onSave={addOrUpdateSpecialDay}
          onClear={async date => {
            const confirmed = await showConfirm({
              title: '¿Quitar Excepción?',
              description: `Esto restaurará el comportamiento por defecto del día ${date}.`,
              intent: 'warning',
            })
            if (confirmed) {
              removeSpecialDay(date)
            }
          }}
        />
      )}

      {swapModalState.isOpen && weeklyPlan && (
        <SwapModal
          weeklyPlan={weeklyPlan}
          initialDate={swapModalState.date || planningAnchorDate}
          initialShift={swapModalState.shift || activeShift}
          initialRepId={swapModalState.repId || undefined}
          existingSwap={swapModalState.existingSwap || undefined}
          onClose={() =>
            setSwapModalState({
              isOpen: false,
              repId: null,
              date: null,
              shift: null,
              existingSwap: null,
            })
          }
        />
      )}

      {/* ✅ NEW: Coverage Detail Modal */}
      {coverageDetailState.isOpen && coverageDetailState.coverageId && (
        <CoverageDetailModal
          mode="VIEW"
          coverageId={coverageDetailState.coverageId}
          onClose={() => setCoverageDetailState({ isOpen: false, coverageId: null })}
          onCancel={() => {
            // Refresh after cancellation
            setCoverageDetailState({ isOpen: false, coverageId: null })
          }}
        />
      )}

      {/* GLOBAL PROMPT DIALOG */}
      {promptConfig && (
        <PromptDialog
          open={promptConfig.open}
          title={promptConfig.title}
          description={promptConfig.description}
          placeholder={promptConfig.placeholder}
          optional={promptConfig.optional}
          onConfirm={(val) => promptConfig.resolve(val)}
          onCancel={() => promptConfig.resolve(undefined)}
        />
      )}
    </div>
  )
}
