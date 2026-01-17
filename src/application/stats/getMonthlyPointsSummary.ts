import {
  Incident,
  Representative,
  IncidentType,
  RepresentativeRole,
  ShiftType,
} from '@/domain/types'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'

export interface PayrollRow {
  repId: string
  repName: string
  tardanza: number
  ausencia: number
  errores: number
  otros: number
  total: number
}

export interface MonthlyPointsSummary {
  salesDay: PayrollRow[]
  salesNight: PayrollRow[]
  serviceDay: PayrollRow[]
  serviceNight: PayrollRow[]
}

const PUNITIVE_INCIDENTS: IncidentType[] = [
  'TARDANZA',
  'AUSENCIA',
  'ERROR',
  'OTRO',
]

export function getMonthlyPointsSummary(
  representatives: Representative[],
  incidents: Incident[],
  month: string // YYYY-MM
): MonthlyPointsSummary {
  const incidentsForMonth = incidents.filter(
    i =>
      PUNITIVE_INCIDENTS.includes(i.type) &&
      i.startDate.startsWith(month)
  )

  const buildRows = (reps: Representative[]): PayrollRow[] =>
    reps.map(rep => {
      const row: PayrollRow = {
        repId: rep.id,
        repName: rep.name,
        tardanza: 0,
        ausencia: 0,
        errores: 0,
        otros: 0,
        total: 0,
      }

      incidentsForMonth
        .filter(i => i.representativeId === rep.id)
        .forEach(incident => {
          const points =
            incident.type === 'OTRO'
              ? incident.customPoints ?? 0
              : calculatePoints(incident)

          switch (incident.type) {
            case 'TARDANZA':
              row.tardanza += points
              break
            case 'AUSENCIA':
              row.ausencia += points
              break
            case 'ERROR':
              row.errores += points
              break
            case 'OTRO':
              row.otros += points
              break
          }
        })

      row.total =
        row.tardanza +
        row.ausencia +
        row.errores +
        row.otros

      return row
    })
    
  const filterReps = (role: RepresentativeRole, shift: ShiftType) => {
    return representatives.filter(
      r => r.isActive !== false && (r.role ?? 'SALES') === role && r.baseShift === shift
    )
  }

  return {
    salesDay: buildRows(filterReps('SALES', 'DAY')),
    salesNight: buildRows(filterReps('SALES', 'NIGHT')),
    serviceDay: buildRows(filterReps('CUSTOMER_SERVICE', 'DAY')),
    serviceNight: buildRows(filterReps('CUSTOMER_SERVICE', 'NIGHT')),
  }
}
