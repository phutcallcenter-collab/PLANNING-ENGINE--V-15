'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  PlanningBaseState,
  CoverageRule,
  SpecialDay,
  ISODate,
  DayInfo,
  Incident,
  IncidentInput,
  Representative,
  SwapEvent,
  ShiftAssignment,
  RepresentativeRole,
  SpecialSchedule,
  EffectiveSchedulePeriod,
  WeeklyPattern,
  DailyDuty,
} from '@/domain/types'
import { Manager } from '@/domain/management/types'
import { createInitialState, createBaseSchedule } from '@/domain/state'
import { loadState, saveState } from '@/persistence/storage'
import {
  getYear,
  getMonth,
  addDays,
  parseISO,
  format,
  startOfWeek,
} from 'date-fns'
import { generateMonthDays } from '@/domain/calendar/state'
import { validateIncident } from '@/domain/incidents/validateIncident'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import React, { ReactNode } from 'react'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'
import { AuditEvent } from '@/domain/audit/types'
import { recordAuditEvent } from '@/domain/audit/auditRecorder'
import * as humanize from '@/application/presenters/humanize'
import { BackupPayload } from '@/application/backup/types'
import { validateNoOverlap } from '@/domain/planning/effectivePeriodHelpers'
import { ManagementScheduleSlice, createManagementScheduleSlice } from './managementScheduleSlice'

// --- UI Slice Types ---
type ConfirmIntent = 'danger' | 'warning' | 'info'
interface ConfirmOptions {
  title: string
  description?: ReactNode
  intent?: ConfirmIntent
  confirmLabel?: string
  cancelLabel?: string
}
type PromiseResolve<T> = (value: T) => void

interface ConfirmState {
  options: ConfirmOptions
  resolve: PromiseResolve<boolean>
}
interface DetailModalState {
  isOpen: boolean
  personId: string | null
  month: string | null // YYYY-MM
}
interface MixedShiftConfirmModalState {
  isOpen: boolean
  representativeId: string | null
  date: ISODate | null
  activeShift: 'DAY' | 'NIGHT'
  resolve: PromiseResolve<ShiftAssignment | null>
}

interface VacationConfirmationState {
  isOpen: boolean
  repName: string
  startDate: ISODate
  endDate: ISODate
  returnDate: ISODate
  workingDays: number
}

// --- Undo Slice Types ---
export interface UndoAction {
  id: string
  label: string
  undo: () => void
  timeoutId?: number
}

// --- History/Audit Types ---
export interface HistoryEvent {
  id: string
  timestamp: string // ISO
  title: string
  category: 'INCIDENT' | 'RULE' | 'CALENDAR' | 'PLANNING' | 'SYSTEM' | 'SETTINGS'
  subject?: string // e.g., "Ana García"
  impact?: string // e.g., "-3 Puntos", "Turno Modificado"
  description?: string // e.g., "Se eliminó el turno"
  metadata?: Record<string, any>
}

export const DOMAIN_VERSION = 7

// --- Main App State ---
export type AppState = PlanningBaseState & ManagementScheduleSlice & {
  isLoading: boolean
  planningAnchorDate: ISODate
  allCalendarDaysForRelevantMonths: DayInfo[]
  confirmState: ConfirmState | null
  detailModalState: DetailModalState
  mixedShiftConfirmModalState: MixedShiftConfirmModalState | null
  vacationConfirmationState: VacationConfirmationState | null
  undoStack: UndoAction[]

  // Actions
  initialize: () => Promise<void>
  setPlanningAnchorDate: (date: ISODate) => void
  addOrUpdateCoverageRule: (rule: CoverageRule) => void
  removeCoverageRule: (id: string) => void
  addOrUpdateSpecialDay: (day: SpecialDay) => void
  removeSpecialDay: (date: ISODate) => void
  resetState: (keepFormalIncidents: boolean) => void
  addIncident: (
    data: IncidentInput,
    skipConfirm?: boolean
  ) => Promise<{ ok: true; newId: string } | { ok: false; reason: string }>
  removeIncident: (id: string, silent?: boolean) => void
  removeIncidents: (ids: string[]) => void
  addSwap: (data: Omit<SwapEvent, 'id' | 'createdAt'>) => void
  removeSwap: (id: string) => void
  showConfirm: (options: ConfirmOptions) => Promise<boolean>
  handleConfirm: (value: boolean) => void
  openDetailModal: (personId: string, month: string) => void
  closeDetailModal: () => void
  showMixedShiftConfirmModal: (
    representativeId: string,
    date: ISODate,
    activeShift: 'DAY' | 'NIGHT'
  ) => Promise<ShiftAssignment | null>
  handleMixedShiftConfirm: (assignment: ShiftAssignment | null) => void
  closeVacationConfirmation: () => void

  // Private/internal state management
  _generateCalendarDays: () => void

  // Representative Actions
  addRepresentative: (data: Omit<Representative, 'id' | 'isActive'>) => void
  updateRepresentative: (rep: Representative) => void
  deactivateRepresentative: (repId: string) => void
  reorderRepresentatives: (shift: 'DAY' | 'NIGHT', orderedIds: string[]) => void
  normalizeOrderIndexes: (shift: 'DAY' | 'NIGHT') => void

  // Special Schedule Actions
  addSpecialSchedule: (data: Omit<SpecialSchedule, 'id'>) => void
  removeSpecialSchedule: (id: string) => void

  // Effective Period Actions
  addEffectivePeriod: (data: Omit<EffectiveSchedulePeriod, 'id' | 'createdAt'>) => { success: boolean; error?: string }
  updateEffectivePeriod: (id: string, updates: Partial<Omit<EffectiveSchedulePeriod, 'id' | 'representativeId'>>) => { success: boolean; error?: string }
  deleteEffectivePeriod: (id: string) => void

  // History Actions
  addHistoryEvent: (data: Omit<HistoryEvent, 'id' | 'timestamp'>) => void

  // Audit Actions
  addAuditEvent: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void

  // Undo Actions
  pushUndo: (
    action: Omit<UndoAction, 'id' | 'timeoutId'>,
    timeoutMs?: number
  ) => void
  commitUndo: (id: string) => void
  executeUndo: (id: string) => void

  // Backup/Restore
  exportState: () => PlanningBaseState
  importState: (data: BackupPayload) => { success: boolean; message: string }

  // Manager Actions (Entity Management Only)
  addManager: (data: Omit<Manager, 'id'>) => void
  removeManager: (id: string) => void
}

export const useAppStore = create<AppState>()(
  immer((set, get, api) => ({
    ...createInitialState(),
    ...createManagementScheduleSlice(set, get, api),
    managers: [],
    isLoading: true,
    planningAnchorDate: new Date().toISOString().split('T')[0],
    allCalendarDaysForRelevantMonths: [],
    confirmState: null,
    detailModalState: {
      isOpen: false,
      personId: null,
      month: null,
    },
    vacationConfirmationState: null,
    mixedShiftConfirmModalState: null,
    undoStack: [],

    async initialize() {
      const stored = await loadState();
      // If nothing is in storage, create and save initial state.
      if (!stored) {
        const initialState = createInitialState();
        set(s => {
          Object.assign(s, initialState);
          s.isLoading = false;
        });
        await saveState(initialState);
      } else {
        // Otherwise, load the stored state.
        set(s => {
          Object.assign(s, stored);

          // 🔧 Migración: asignar orderIndex si no existe
          s.representatives.forEach((rep, index) => {
            if (rep.orderIndex === undefined) {
              rep.orderIndex = index
            }
          })

          s.isLoading = false;
        });
      }
      get()._generateCalendarDays();
    },

    setPlanningAnchorDate: date => {
      set(state => {
        const monday = format(
          startOfWeek(parseISO(date), { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )
        state.planningAnchorDate = monday
      })
      get()._generateCalendarDays()
    },

    _generateCalendarDays: () => {
      set(state => {
        if (!state.calendar) return

        const anchor = new Date(state.planningAnchorDate + 'T12:00:00Z')
        const allDays = new Map<string, DayInfo>()
        for (let i = -6; i <= 18; i++) {
          const dateToGenerate = addDays(anchor, i * 30)
          const year = getYear(dateToGenerate)
          const month = getMonth(dateToGenerate) + 1
          const monthDays = generateMonthDays(year, month, state.calendar)
          monthDays.forEach(day => {
            if (!allDays.has(day.date)) {
              allDays.set(day.date, day)
            }
          })
        }
        state.allCalendarDaysForRelevantMonths = Array.from(allDays.values())
      })
    },

    addOrUpdateCoverageRule: rule => {
      const { addHistoryEvent } = get()
      addHistoryEvent({
        category: 'RULE',
        title: `Regla de cobertura actualizada`,
        description: rule.label || rule.id,
        impact: `Mínimo ${rule.required} pers.`,
        metadata: { rule },
      })
      set(state => {
        const safeValue = Math.max(0, Math.floor(rule.required))
        const updatedRule = { ...rule, required: safeValue }
        const exists = state.coverageRules.some(r => r.id === updatedRule.id)
        if (exists) {
          state.coverageRules = state.coverageRules.map(r =>
            r.id === updatedRule.id ? updatedRule : r
          )
        } else {
          state.coverageRules.push(updatedRule)
        }
      })
    },

    removeCoverageRule: id => {
      const { addHistoryEvent, coverageRules } = get()
      const ruleToRemove = coverageRules.find(r => r.id === id)
      if (ruleToRemove) {
        addHistoryEvent({
          category: 'RULE',
          title: `Regla de cobertura eliminada`,
          description: ruleToRemove.label || ruleToRemove.id,
          metadata: { rule: ruleToRemove },
        })
      }
      set(state => {
        state.coverageRules = state.coverageRules.filter(r => r.id !== id)
      })
    },

    addOrUpdateSpecialDay: day => {
      const { addHistoryEvent } = get()
      addHistoryEvent({
        category: 'CALENDAR',
        title: `Día especial actualizado`,
        subject: day.date,
        description: day.label,
        impact: day.kind,
        metadata: { day },
      })
      set(state => {
        const others = state.calendar.specialDays.filter(
          d => d.date !== day.date
        )
        state.calendar.specialDays = [...others, day]
      })
      get()._generateCalendarDays()
    },

    removeSpecialDay: date => {
      const { addHistoryEvent } = get()
      addHistoryEvent({
        category: 'CALENDAR',
        title: `Excepción de día eliminada`,
        subject: date,
      })
      set(state => {
        state.calendar.specialDays = state.calendar.specialDays.filter(
          d => d.date !== date
        )
      })
      get()._generateCalendarDays()
    },

    resetState: async keepFormalIncidents => {
      const { showConfirm } = get()
      const confirmed = await showConfirm({
        title: '⚠️ ¿Reiniciar la planificación?',
        description:
          'Esto restaurará el estado a los valores iniciales. Esta acción no se puede deshacer.',
        intent: 'danger',
        confirmLabel: 'Sí, reiniciar',
      })

      if (confirmed) {
        set(state => {
          const freshState = createInitialState()
          let incidentsToKeep: Incident[] = []
          if (keepFormalIncidents) {
            incidentsToKeep = state.incidents.filter(
              i => i.type === 'LICENCIA' || i.type === 'VACACIONES'
            )
            freshState.incidents = incidentsToKeep
          }
          Object.assign(state, freshState, { isLoading: false })
        })
        get()._generateCalendarDays()
      }
    },

    addIncident: async (incidentData, skipConfirm = false) => {
      const {
        representatives,
        incidents,
        allCalendarDaysForRelevantMonths,
        showConfirm,
      } = get()
      const rep = representatives.find(
        r => r.id === incidentData.representativeId
      )
      if (!rep) {
        return { ok: false, reason: 'Representante no encontrado.' }
      }

      // Ensure a unique ID for the new incident.
      const newIncident: Incident = {
        id: `incident-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        ...incidentData,
      };

      const validation = validateIncident(
        newIncident,
        incidents,
        allCalendarDaysForRelevantMonths,
        rep,
        representatives
      )

      if (!validation.ok) {
        return { ok: false, reason: validation.message }
      }

      let confirmed = skipConfirm;

      if (!confirmed) {
        if (validation.warning) {
          confirmed = await showConfirm({
            title: 'Confirmar Acción',
            description: validation.warning,
            intent: 'warning',
            confirmLabel: 'Continuar',
          });
        } else {
          const isOverride = newIncident.type === 'OVERRIDE'
          const repName = humanize.repName(representatives, newIncident.representativeId)
          const incidentLabel = humanize.incidentLabel(newIncident.type)

          confirmed = await showConfirm({
            title: isOverride ? 'Confirmar Cambio de Turno' : 'Confirmar Incidencia',
            description: React.createElement('span', null,
              'Registrar ',
              isOverride ? 'una modificación manual' : React.createElement('strong', { style: { fontWeight: 700, color: 'var(--text-main)' } }, incidentLabel),
              ' a ',
              React.createElement('strong', { style: { fontWeight: 700, color: 'var(--text-main)' } }, repName),
              '.'
            ),
            intent: isOverride ? 'info' : 'info',
            confirmLabel: isOverride ? 'Aplicar Cambio' : 'Registrar',
          });
        }

        if (!confirmed) {
          return { ok: false, reason: 'Acción cancelada por el usuario.' }
        }
      }


      const { addHistoryEvent, addAuditEvent, pushUndo } = get()

      addHistoryEvent({
        category: 'INCIDENT',
        title: `${humanize.incidentLabel(newIncident.type)} registrada`,
        subject: rep.name,
        impact: newIncident.type !== 'OVERRIDE' && newIncident.type !== 'VACACIONES' && newIncident.type !== 'LICENCIA' ? `-${calculatePoints(newIncident)} pts` : undefined,
        description: newIncident.note,
      })
      addAuditEvent({
        actor: { id: 'admin', name: 'Administrador' },
        action: 'INCIDENT_CREATED',
        target: {
          entity: 'INCIDENT',
          entityId: newIncident.id,
          label: humanize.incidentLabel(newIncident.type),
        },
        context: {
          date: newIncident.startDate,
          representativeId: newIncident.representativeId,
          reason: newIncident.note,
        },
      })


      set(state => {
        if (newIncident.type === 'AUSENCIA') {
          const removedIncidents = state.incidents.filter(
            i =>
              i.representativeId === newIncident.representativeId &&
              i.startDate === newIncident.startDate
          )
          if (removedIncidents.length > 0) {
            addHistoryEvent({
              category: 'SYSTEM',
              title: `Incidencias limpiadas por AUSENCIA`,
              subject: rep.name,
              description: `Se eliminaron ${removedIncidents.length} evento(s) previos.`,
            })
          }
          state.incidents = state.incidents.filter(
            i =>
              !(
                i.representativeId === newIncident.representativeId &&
                i.startDate === newIncident.startDate
              )
          )
        }

        // Ensure we are not adding a duplicate. This can happen with fast clicks.
        if (!state.incidents.some(i => i.id === newIncident.id)) {
          state.incidents.push(newIncident);
        }

        if (newIncident.type !== 'OVERRIDE') {
          // Automatic undo moved to UI layer
        }

        if (newIncident.type === 'VACACIONES') {
          const resolvedDates = resolveIncidentDates(
            newIncident,
            allCalendarDaysForRelevantMonths,
            rep
          )
          if (resolvedDates.dates.length > 0) {
            state.vacationConfirmationState = {
              isOpen: true,
              repName: rep.name,
              startDate: resolvedDates.start || newIncident.startDate,
              endDate: resolvedDates.end || newIncident.startDate,
              returnDate: resolvedDates.returnDate || newIncident.startDate,
              workingDays: resolvedDates.dates.length,
            }
          }
        }
      })

      return { ok: true, newId: newIncident.id }
    },
    removeIncident: (id, silent = false) => {
      const {
        incidents,
        representatives,
        addHistoryEvent,
        addAuditEvent,
      } = get()
      const incidentToRemove = incidents.find(i => i.id === id)
      if (!incidentToRemove) return

      if (!silent) {
        const repNameText = humanize.repName(
          representatives,
          incidentToRemove.representativeId
        )

        addHistoryEvent({
          category: 'INCIDENT',
          title: `Incidencia eliminada: ${humanize.incidentLabel(
            incidentToRemove.type
          )}`,
          subject: repNameText,
          metadata: { incident: incidentToRemove },
        })
        addAuditEvent({
          actor: { id: 'admin', name: 'Administrador' },
          action: 'INCIDENT_DELETED',
          target: {
            entity: 'INCIDENT',
            entityId: incidentToRemove.id,
            label: humanize.incidentLabel(incidentToRemove.type),
          },
          context: {
            date: incidentToRemove.startDate,
            representativeId: incidentToRemove.representativeId,
            reason: 'Eliminación manual',
          },
        })
      }


      set(state => {
        state.incidents = state.incidents.filter(i => i.id !== id)
      })
    },
    removeIncidents: ids => {
      const { incidents, representatives, pushUndo, addHistoryEvent } = get()
      const incidentsToRemove = incidents.filter(i => ids.includes(i.id))
      if (incidentsToRemove.length === 0) return

      const repId = incidentsToRemove[0].representativeId
      const repNameText = humanize.repName(representatives, repId)

      addHistoryEvent({
        category: 'INCIDENT',
        title: `${incidentsToRemove.length} incidencia(s) eliminada(s)`,
        subject: repNameText,
        description: `Tipo: ${humanize.incidentLabel(
          incidentsToRemove[0].type
        )}`,
        metadata: { incidents: incidentsToRemove },
      })

      set(state => {
        incidentsToRemove.forEach(incident => {
          if (incident.type === 'OVERRIDE') return
          recordAuditEvent(state, {
            action: 'INCIDENT_DELETED',
            actor: { id: 'admin', name: 'Administrador' },
            target: {
              entity: 'INCIDENT',
              entityId: incident.id,
              label: humanize.incidentLabel(incident.type),
            },
            context: {
              date: incident.startDate,
              representativeId: incident.representativeId,
              reason: 'Eliminación múltiple',
            },
          })
        })
        state.incidents = state.incidents.filter(i => !ids.includes(i.id))
      })

      pushUndo({
        label: `Restauradas ${incidentsToRemove.length} incidencias de ${repNameText}`,
        undo: () => {
          addHistoryEvent({
            category: 'SYSTEM',
            title: 'Incidencias restauradas por "Deshacer"',
            subject: repNameText,
            metadata: { incidents: incidentsToRemove },
          })
          set(s => {
            s.incidents.push(...incidentsToRemove)
          })
        },
      })
    },

    addSwap: data => {
      const { addHistoryEvent, representatives, pushUndo } = get()
      const swap = {
        id: `swap-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        ...data,
      } as SwapEvent;

      set(state => {
        state.swaps.push(swap)
      })

      addHistoryEvent({
        category: 'PLANNING',
        title: 'Cobertura registrada',
        description: humanize.swapDescription(swap, representatives),
        metadata: { swap },
      })

      pushUndo({
        label: `Cobertura cancelada: ${humanize.swapDescription(swap, representatives).substring(0, 50)}...`,
        undo: () => {
          set(state => {
            state.swaps = state.swaps.filter(s => s.id !== swap.id);
          });
          addHistoryEvent({
            category: 'SYSTEM',
            title: 'Cambio de turno deshecho',
            description: `Se revirtió: ${humanize.swapDescription(swap, representatives)}`,
          });
        }
      });
    },

    removeSwap: (id: string) => {
      set(state => {
        state.swaps = state.swaps.filter(s => s.id !== id);
      })
    },

    deactivateRepresentative: async repId => {
      const { showConfirm, representatives, normalizeOrderIndexes } = get()
      const repNameText = humanize.repName(representatives, repId)
      const rep = representatives.find(r => r.id === repId)

      const confirmed = await showConfirm({
        title: '¿Desactivar Representante?',
        description: `Estás a punto de desactivar a ${repNameText}. No aparecerá en los nuevos planes, pero su historial se conservará. ¿Estás seguro?`,
        intent: 'warning',
        confirmLabel: 'Sí, desactivar',
      })

      if (confirmed) {
        set(state => {
          const index = state.representatives.findIndex(r => r.id === repId)
          if (index !== -1) {
            state.representatives[index].isActive = false
          }
        })

        // Normalizar índices del turno afectado
        if (rep?.baseShift) {
          normalizeOrderIndexes(rep.baseShift)
        }
      }
    },
    showConfirm: (options: ConfirmOptions) => {
      return new Promise(resolve => {
        set(state => {
          state.confirmState = { options, resolve }
        })
      })
    },
    handleConfirm: (value: boolean) => {
      set(state => {
        if (state.confirmState) {
          state.confirmState.resolve(value)
          state.confirmState = null
        }
      })
    },
    showMixedShiftConfirmModal: (representativeId, date, activeShift) => {
      return new Promise(resolve => {
        set(state => {
          state.mixedShiftConfirmModalState = {
            isOpen: true,
            representativeId,
            date,
            activeShift,
            resolve,
          }
        })
      })
    },
    handleMixedShiftConfirm: (assignment: ShiftAssignment | null) => {
      set(state => {
        if (state.mixedShiftConfirmModalState) {
          state.mixedShiftConfirmModalState.resolve(assignment)
          state.mixedShiftConfirmModalState = null
        }
      })
    },
    addRepresentative: data => {
      set(state => {
        state.representatives.push({
          id: crypto.randomUUID(),
          ...data,
          isActive: true,
        })
      })
    },
    updateRepresentative: updatedRep => {
      set(state => {
        const index = state.representatives.findIndex(
          r => r.id === updatedRep.id
        )
        if (index !== -1) {
          state.representatives[index] = {
            ...state.representatives[index],
            ...updatedRep,
          }
        }
      })
    },
    // 🎯 Reordenamiento canónico de representantes
    reorderRepresentatives: (shift, orderedIds) => {
      set(state => {
        // 🔒 Validación defensiva: verificar que el orden está completo
        const repsInShift = state.representatives.filter(
          r => r.baseShift === shift && r.isActive
        )

        if (orderedIds.length !== repsInShift.length) {
          console.warn('⚠️ Orden incompleto ignorado. Esperado:', repsInShift.length, 'Recibido:', orderedIds.length)
          return
        }

        // Actualización atómica: recibimos el orden completo, no eventos
        orderedIds.forEach((id, index) => {
          const rep = state.representatives.find(r => r.id === id)
          if (rep && rep.baseShift === shift) {
            rep.orderIndex = index
          }
        })
      })

      // Opcional: agregar a historial
      get().addHistoryEvent({
        category: 'SETTINGS',
        title: `Orden de ${shift === 'DAY' ? 'Día' : 'Noche'} actualizado`,
        description: 'Se reordenaron los representantes del turno',
      })
    },

    // 🔧 Normalización de orderIndex después de borrados/desactivaciones
    normalizeOrderIndexes: (shift) => {
      set(state => {
        const reps = state.representatives
          .filter(r => r.baseShift === shift && r.isActive)
          .sort((a, b) => a.orderIndex - b.orderIndex)

        reps.forEach((rep, index) => {
          rep.orderIndex = index
        })
      })
    },
    addSpecialSchedule: data => {
      set(state => {
        const newSchedule: SpecialSchedule = {
          id: `ss-${crypto.randomUUID()}`,
          ...data,
        }
        state.specialSchedules.push(newSchedule)
      })
    },
    removeSpecialSchedule: id => {
      set(state => {
        state.specialSchedules = state.specialSchedules.filter(
          ss => ss.id !== id
        )
      })
    },

    // ===============================================
    // Manager Actions
    // ===============================================
    addManager: data => {
      set(state => {
        state.managers.push({
          id: crypto.randomUUID(),
          ...data,
        })
      })
    },

    removeManager: id => {
      set(state => {
        state.managers = state.managers.filter((m: Manager) => m.id !== id)
        // Also clean up schedules? User said "No validaciones cruzadas", but cleaning up is good.
        // But maybe we want to keep history?
        // User said: "Si mañana hay historial → se versiona".
        // Use safest approach: keep schedules for now (audit), or delete?
        // Remove manager from representatives array
        state.representatives = state.representatives.filter(r => r.id !== id)
      })
    },



    // ===============================================
    // Effective Period Actions
    // ===============================================
    addEffectivePeriod: data => {
      const { effectivePeriods } = get()

      // Validate no overlap
      const error = validateNoOverlap(effectivePeriods, data)
      if (error) {
        return { success: false, error }
      }

      set(state => {
        const newPeriod: EffectiveSchedulePeriod = {
          id: `ep-${crypto.randomUUID()}`,
          createdAt: new Date().toISOString().split('T')[0],
          ...data,
        }
        state.effectivePeriods.push(newPeriod)
      })

      return { success: true }
    },

    updateEffectivePeriod: (id, updates) => {
      const { effectivePeriods } = get()
      const existing = effectivePeriods.find(p => p.id === id)

      if (!existing) {
        return { success: false, error: 'Período no encontrado' }
      }

      // Create updated period for validation
      const updated = { ...existing, ...updates }

      // Validate no overlap (excluding this period)
      const error = validateNoOverlap(effectivePeriods, updated, id)
      if (error) {
        return { success: false, error }
      }

      set(state => {
        const period = state.effectivePeriods.find(p => p.id === id)
        if (period) {
          Object.assign(period, updates)
        }
      })

      return { success: true }
    },

    deleteEffectivePeriod: id => {
      set(state => {
        state.effectivePeriods = state.effectivePeriods.filter(
          p => p.id !== id
        )
      })
    },
    openDetailModal: (personId, month) => {
      set({ detailModalState: { isOpen: true, personId, month } })
    },
    closeDetailModal: () => {
      set({ detailModalState: { isOpen: false, personId: null, month: null } })
    },
    addHistoryEvent: (data: Omit<HistoryEvent, 'id' | 'timestamp'>) => {
      set(state => {
        const newEvent: HistoryEvent = {
          id: `hist-${crypto.randomUUID()}`,
          timestamp: new Date().toISOString(),
          ...data,
        }
        state.historyEvents.unshift(newEvent)
      })
    },
    addAuditEvent: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
      set(state => {
        recordAuditEvent(state, event)
      })
    },
    pushUndo: (action, timeoutMs = 6000) => {
      const { commitUndo } = get()
      set(state => {
        // Clear any existing stack to enforce single buffer
        state.undoStack.forEach(item => clearTimeout(item.timeoutId))
        state.undoStack = []

        const id = `undo-${crypto.randomUUID()}`

        const timeoutId = window.setTimeout(() => {
          commitUndo(id)
        }, timeoutMs)

        state.undoStack.push({ ...action, id, timeoutId: timeoutId as any })
      })
    },
    commitUndo: (id: string) => {
      set(state => {
        state.undoStack = state.undoStack.filter(a => a.id !== id)
      })
    },
    executeUndo: (id: string) => {
      const { undoStack, commitUndo } = get()
      const action = undoStack.find(a => a.id === id)
      if (action) {
        clearTimeout(action.timeoutId)
        action.undo()
        commitUndo(id)
      }
    },
    closeVacationConfirmation: () => {
      set({ vacationConfirmationState: null })
    },
    exportState: () => {
      const {
        representatives,
        incidents,
        calendar,
        coverageRules,
        swaps,
        specialSchedules,
        effectivePeriods,
        historyEvents,
        auditLog,
        managers,
        managementSchedules,
        version,
      } = get()

      return {
        representatives,
        incidents,
        calendar,
        coverageRules,
        swaps,
        specialSchedules,
        effectivePeriods,
        historyEvents,
        auditLog,
        managers,
        managementSchedules,
        version,
      }
    },
    importState: (data: BackupPayload) => {
      const safeState: PlanningBaseState = {
        ...createInitialState(),
        representatives: Array.isArray(data.representatives)
          ? data.representatives
          : [],
        incidents: Array.isArray(data.incidents) ? data.incidents : [],
        calendar: data.calendar ?? createInitialState().calendar,
        coverageRules: data.coverageRules ?? [],
        swaps: data.swaps ?? [],
        historyEvents: data.historyEvents ?? [],
        auditLog: data.auditLog ?? [],
        specialSchedules: data.specialSchedules ?? [],
        effectivePeriods: data.effectivePeriods ?? [],
        managers: data.managers ?? [],
        managementSchedules: data.managementSchedules ?? {},
        version: DOMAIN_VERSION,
      }

      set(state => {
        Object.assign(state, safeState, {
          isLoading: false,
          planningAnchorDate: new Date().toISOString().split('T')[0],
          confirmState: null,
          mixedShiftConfirmModalState: null,
          vacationConfirmationState: null,
          undoStack: [],
        })
      })

      get()._generateCalendarDays()

      return { success: true, message: 'Estado importado correctamente.' }
    },
  }))
)

// This function is defined here because it needs access to `get` from the store creation context.
export const stateToPersist = (state: AppState): PlanningBaseState => {
  const {
    representatives,
    incidents,
    calendar,
    coverageRules,
    swaps,
    specialSchedules,
    effectivePeriods,
    historyEvents,
    auditLog,
    managers,
    managementSchedules,
    version,
  } = state
  return {
    representatives,
    incidents,
    calendar,
    coverageRules,
    swaps,
    specialSchedules,
    effectivePeriods,
    historyEvents,
    auditLog,
    managers,
    managementSchedules,
    version,
  }
}
