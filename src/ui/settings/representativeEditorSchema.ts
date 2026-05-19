import { createBaseSchedule } from '@/domain/state'
import type {
  BaseSchedule,
  EmploymentType,
  Representative,
  RepresentativeRole,
  ShiftType,
} from '@/domain/types'

export type RepresentativeDraft = Pick<
  Representative,
  | 'name'
  | 'baseShift'
  | 'role'
  | 'baseSchedule'
  | 'mixProfile'
  | 'employmentType'
  | 'commercialEligible'
>

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'] as const

export function createRepresentativeDraft(
  rep?: Representative | null
): RepresentativeDraft {
  return {
    name: rep?.name ?? '',
    baseShift: rep?.baseShift ?? 'DAY',
    role: rep?.role ?? 'SALES',
    baseSchedule: { ...(rep?.baseSchedule ?? createBaseSchedule([1])) },
    mixProfile: rep?.mixProfile ? { ...rep.mixProfile } : undefined,
    employmentType: rep ? rep.employmentType : 'FULL_TIME',
    commercialEligible: rep ? rep.commercialEligible === true : true,
  }
}

export function getRepresentativeShiftLabel(shift: ShiftType) {
  return shift === 'DAY' ? 'Dia' : 'Noche'
}

export function getRepresentativeRoleLabel(role: RepresentativeRole) {
  switch (role) {
    case 'CUSTOMER_SERVICE':
      return 'Servicio al Cliente'
    case 'SUPERVISOR':
      return 'Supervisor'
    case 'MANAGER':
      return 'Manager'
    default:
      return 'Ventas'
  }
}

export function getRepresentativeEmploymentLabel(
  employmentType?: EmploymentType,
  mixProfile?: Representative['mixProfile']
) {
  if (mixProfile) {
    return 'Mixto'
  }

  if (!employmentType) {
    return 'Sin jornada'
  }

  return employmentType === 'PART_TIME' ? 'Part Time' : 'Full Time'
}

export function getRepresentativeCommercialLabel(commercialEligible: boolean) {
  return commercialEligible ? 'Ranking comercial activo' : 'Fuera del ranking comercial'
}

export function getRepresentativeMixLabel(rep?: Pick<Representative, 'mixProfile'> | null) {
  if (rep?.mixProfile?.type === 'WEEKDAY') {
    return 'Mixto L-J'
  }

  if (rep?.mixProfile?.type === 'WEEKEND') {
    return 'Mixto Vie-Dom'
  }

  return 'Sin mixto'
}

export function countRepresentativeDayOffs(schedule: BaseSchedule) {
  return Object.values(schedule).filter(day => day === 'OFF').length
}

export function getRepresentativeOffDayLabels(schedule: BaseSchedule) {
  return WEEKDAY_LABELS.filter((_, index) => schedule[index] === 'OFF')
}

export function getRepresentativeDraftChanges(
  initialDraft: RepresentativeDraft,
  currentDraft: RepresentativeDraft
) {
  const changes: string[] = []

  if (initialDraft.name.trim() !== currentDraft.name.trim()) {
    changes.push('Nombre')
  }

  if (initialDraft.baseShift !== currentDraft.baseShift) {
    changes.push('Turno base')
  }

  if (initialDraft.role !== currentDraft.role) {
    changes.push('Rol')
  }

  if (initialDraft.mixProfile?.type !== currentDraft.mixProfile?.type) {
    changes.push('Patron mixto')
  }

  if (initialDraft.employmentType !== currentDraft.employmentType) {
    changes.push('Jornada contractual')
  }

  if (
    (initialDraft.commercialEligible ?? false) !==
    (currentDraft.commercialEligible ?? false)
  ) {
    changes.push('Elegibilidad comercial')
  }

  const scheduleChanged = Array.from({ length: 7 }, (_, index) => index).some(
    dayIndex => initialDraft.baseSchedule[dayIndex] !== currentDraft.baseSchedule[dayIndex]
  )

  if (scheduleChanged) {
    changes.push('Dias libres base')
  }

  return changes
}
