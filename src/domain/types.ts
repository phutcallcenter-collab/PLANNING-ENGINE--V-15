import type { Representative, BaseSchedule, RepresentativeRole, RepresentativeId } from './representatives/types'
// This Incident type is now the "raw" data type, without calculated points.
// Points are calculated on-the-fly by the analytics layer, not stored here.
import type {
  Incident,
  IncidentType,
  DailyStatus,
  IncidentInput,
} from './incidents/types'
import type {
  ISODate,
  DayInfo,
  CalendarState,
  SpecialDay,
  DayKind,
  ShiftType,
} from './calendar/types'
import { ResolvedCoverage } from './planning/resolveCoverage'
import { AvailabilityStatus } from './availability/getAvailabilityStatus'
import { AuditEvent } from './audit/types'
import { HistoryEvent } from '@/store/useAppStore'
import { SwapEvent, SwapType } from './planning/swap'
import { ShiftAssignment } from './planning/shiftAssignment'


// Re-export ISODate to be available from the root domain types
export type { ISODate, DayInfo, SpecialDay, DayKind } from './calendar/types'
export type {
  Representative,
  RepresentativeId,
  BaseSchedule,
  RepresentativeRole,
} from './representatives/types'
export type { ShiftType }
export type {
  DailyStatus,
  IncidentInput,
} from './incidents/types'
export type {
  WeeklyPlan,
  WeeklyPresence,
  DailyPresence,
} from './planning/types'
export type { CalendarState }
export type { ResolvedCoverage }
export type { AvailabilityStatus }
export type { AuditEvent }
export type { SwapEvent, SwapType }
export type { ShiftAssignment }
export type { WeeklyPattern, DailyDuty } from './planning/effectiveSchedulePeriod'
import { Manager, ManagerSchedule, ManagerDuty, ManagerAssignment } from './management/types'
export type { Manager, ManagerSchedule, ManagerDuty, ManagerAssignment }

/**
 * Define el alcance de una regla de cobertura.
 * - GLOBAL: Aplica a todos los días y turnos si no hay otra regla más específica.
 * - SHIFT: Aplica a un turno específico (DAY o NIGHT) si no hay una regla por fecha.
 * - DATE: Aplica a una fecha específica, teniendo la máxima prioridad.
 */
export type CoverageRuleScope =
  | { type: 'GLOBAL' }
  | { type: 'SHIFT'; shift: ShiftType }
  | { type: 'DATE'; date: ISODate }
  | { type: 'WEEKDAY'; day: 0 | 1 | 2 | 3 | 4 | 5 | 6; shift?: ShiftType }

/**
 * Representa una regla que define el número mínimo de personas requeridas.
 */
export interface CoverageRule {
  id: string
  scope: CoverageRuleScope
  required: number
  label?: string
}

/**
 * 🟢 CANONICAL SPECIAL SCHEDULE
 * Represents any exception to the base schedule.
 * Flattened, explicit, and unambiguous.
 */

export type DailyScheduleState = 'OFF' | 'DAY' | 'NIGHT' | 'MIXTO'

export interface SpecialSchedule {
  id: string

  // 🟢 Scope: Who does this apply to?
  scope: 'GLOBAL' | 'INDIVIDUAL'
  targetId?: string // Required if scope === 'INDIVIDUAL'

  // 🟢 Period (Flattened)
  from: ISODate
  to: ISODate

  // 🟢 Pattern: Explicit 7-day state
  // KEY: Day of week (0=Sun, ..., 6=Sat)
  // VALUE: The definitive state for that day
  weeklyPattern: {
    0: DailyScheduleState
    1: DailyScheduleState
    2: DailyScheduleState
    3: DailyScheduleState
    4: DailyScheduleState
    5: DailyScheduleState
    6: DailyScheduleState
  }

  note?: string
}


/**
 * The root state object for the entire planning domain.
 * This is the source of truth that is persisted and snapshotted.
 */
export type PlanningBaseState = {
  representatives: Representative[]
  incidents: Incident[]
  calendar: CalendarState
  coverageRules: CoverageRule[]
  specialSchedules: SpecialSchedule[]
  historyEvents: HistoryEvent[]
  auditLog: AuditEvent[]
  swaps: SwapEvent[]
  managers: Manager[]
  managementSchedules: Record<string, ManagerSchedule>
  version: number
}


// =======================
// Analytics Domain Types
// =======================

export type { IncidentType, Incident } from './incidents/types'
