import type {
  PlanningBaseState,
  Incident,
  CalendarState,
  CoverageRule,
  SwapEvent,
  SpecialSchedule,
} from './types'
import { Representative, RepresentativeRole } from './representatives/types'
import { HistoryEvent } from '@/store/useAppStore'
import { AuditEvent } from './audit/types'

const CURRENT_VERSION = 7 // New CoverageRule structure

// Helper to create a full base schedule from a list of off-days
function createBaseSchedule(
  offDays: number[]
): Record<number, 'WORKING' | 'OFF'> {
  const schedule: Record<number, 'WORKING' | 'OFF'> = {}
  for (let i = 0; i < 7; i++) {
    schedule[i] = offDays.includes(i) ? 'OFF' : 'WORKING'
  }
  return schedule
}

// The initial representatives list is now empty.
// They will be managed by the user and persisted in IndexedDB.
const initialRepresentatives: Representative[] = []

const initialIncidents: Incident[] = []
const initialSpecialSchedules: SpecialSchedule[] = []

const initialCalendarState: CalendarState = {
  specialDays: [
    // 2024
    { date: '2024-12-25', kind: 'HOLIDAY', label: 'Navidad' },

    // 2025
    { date: '2025-01-01', kind: 'HOLIDAY', label: 'Año Nuevo' },
    { date: '2025-01-06', kind: 'HOLIDAY', label: 'Día de los Reyes Magos' },
    { date: '2025-01-21', kind: 'HOLIDAY', label: 'Día de la Altagracia' },
    { date: '2025-01-26', kind: 'HOLIDAY', label: 'Día de Duarte' },
    { date: '2025-02-27', kind: 'HOLIDAY', label: 'Día de la Independencia' },
    { date: '2025-04-18', kind: 'HOLIDAY', label: 'Viernes Santo' },
    { date: '2025-05-01', kind: 'HOLIDAY', label: 'Día del Trabajo' },
    { date: '2025-06-19', kind: 'HOLIDAY', label: 'Corpus Christi' },
    { date: '2025-08-16', kind: 'HOLIDAY', label: 'Día de la Restauración' },
    { date: '2025-09-24', kind: 'HOLIDAY', label: 'Día de las Mercedes' },
    { date: '2025-11-06', kind: 'HOLIDAY', label: 'Día de la Constitución' },
    { date: '2025-12-25', kind: 'HOLIDAY', label: 'Navidad' },

    // 2026
    { date: '2026-01-01', kind: 'HOLIDAY', label: 'Año Nuevo' },
    { date: '2026-01-06', kind: 'HOLIDAY', label: 'Día de los Reyes Magos' },
    { date: '2026-01-21', kind: 'HOLIDAY', label: 'Día de la Altagracia' },
    { date: '2026-01-26', kind: 'HOLIDAY', label: 'Día de Duarte' },
    { date: '2026-02-27', kind: 'HOLIDAY', label: 'Día de la Independencia' },
    { date: '2026-04-03', kind: 'HOLIDAY', label: 'Viernes Santo' },
    { date: '2026-05-01', kind: 'HOLIDAY', label: 'Día del Trabajo' },
    { date: '2026-06-04', kind: 'HOLIDAY', label: 'Corpus Christi' },
    { date: '2026-08-16', kind: 'HOLIDAY', label: 'Día de la Restauración' },
    { date: '2026-09-24', kind: 'HOLIDAY', label: 'Día de las Mercedes' },
    { date: '2026-11-06', kind: 'HOLIDAY', label: 'Día de la Constitución' },
    { date: '2026-12-25', kind: 'HOLIDAY', label: 'Navidad' },
  ],
}

// Initial coverage rules, replacing the old minimumCoverage object
const initialCoverageRules: CoverageRule[] = [
  { id: 'global-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 10 },
  { id: 'global-night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 6 },
]

const initialHistory: HistoryEvent[] = []
const initialAuditLog: AuditEvent[] = []
const initialSwaps: SwapEvent[] = []

// Initialize empty state
export function createInitialState(): PlanningBaseState {
  return {
    representatives: initialRepresentatives,
    incidents: initialIncidents,
    specialSchedules: initialSpecialSchedules,
    calendar: initialCalendarState,
    coverageRules: initialCoverageRules,
    version: CURRENT_VERSION,
    historyEvents: initialHistory,
    auditLog: initialAuditLog,
    swaps: initialSwaps,
    managers: [],
    managementSchedules: {},
  }
}

// Helper function exported for use in the store
export { createBaseSchedule }
