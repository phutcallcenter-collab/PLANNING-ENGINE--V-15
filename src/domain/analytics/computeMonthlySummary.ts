'use client'
import type { Incident, Representative } from '../types'
import type {
  MonthlySummary,
  PersonMonthlySummary,
  IncidentWithPoints,
  IncidentType,
} from './types'

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isWeekendDay(date: Date): boolean {
  const day = date.getDay()
  return day === 5 || day === 6 || day === 0 // Viernes, Sábado, Domingo
}

const POINT_RULES: Record<
  Exclude<IncidentType, 'OTRO' | 'LICENCIA' | 'VACACIONES' | 'OVERRIDE' | 'SWAP'>,
  { weekday: number; weekend: number }
> = {
  AUSENCIA: { weekday: 3, weekend: 6 },
  TARDANZA: { weekday: 2, weekend: 3 },
  ERROR: { weekday: 2, weekend: 2 },
}

export function calculatePoints(incident: Incident): number {
  if (!incident.startDate) return 0

  if (
    incident.type === 'LICENCIA' ||
    incident.type === 'VACACIONES' ||
    incident.type === 'OVERRIDE' ||
    (incident.type === 'AUSENCIA' && incident.details === 'JUSTIFICADA')
  ) {
    return 0
  }

  // Handle manual points for 'OTRO' type first
  if (incident.type === 'OTRO') {
    return Number(incident.customPoints ?? 0)
  }

  const date = parseLocalDate(incident.startDate)
  const isWeekend = isWeekendDay(date)

  const rule = POINT_RULES[incident.type as keyof typeof POINT_RULES]
  if (!rule) return 0

  return isWeekend ? rule.weekend : rule.weekday
}

export function computeMonthlySummary(
  incidents: Incident[],
  month: string, // yyyy-mm
  representatives: Representative[]
): MonthlySummary {
  const filtered = incidents.filter(i => i.startDate && i.startDate.startsWith(month))

  const byPersonMap: Record<string, PersonMonthlySummary> = {}

  // Initialize all representatives to ensure they appear even with 0 incidents
  for (const rep of representatives) {
    byPersonMap[rep.id] = {
      representativeId: rep.id,
      name: rep.name,
      incidents: [],
      totals: {
        puntos: 0,
        ausencias: 0,
        tardanzas: 0,
        errores: 0,
      },
      riskLevel: 'ok',
    }
  }

  for (const inc of filtered) {
    const personSummary = byPersonMap[inc.representativeId]
    if (!personSummary) continue // Skip incidents for reps not in the main list

    const points = calculatePoints(inc)

    personSummary.incidents.push({ ...inc, points })
    personSummary.totals.puntos += points

    switch (inc.type) {
      case 'AUSENCIA':
        // Only count unjustified absences for risk metrics
        if (inc.details !== 'JUSTIFICADA') {
          personSummary.totals.ausencias++
        }
        break
      case 'TARDANZA':
        personSummary.totals.tardanzas++
        break
      case 'ERROR':
        personSummary.totals.errores++
        break
    }
  }

  // Post-process to calculate riskLevel
  const finalByPerson: PersonMonthlySummary[] = Object.values(byPersonMap).map(
    p => {
      if (
        p.totals.puntos >= 10 ||
        p.totals.ausencias >= 2 ||
        p.totals.tardanzas >= 3 ||
        p.totals.errores >= 2
      ) {
        p.riskLevel = 'danger'
      } else if (p.totals.puntos > 0) {
        p.riskLevel = 'warning'
      }
      return p
    }
  )

  const globalTotals = {
    totalPoints: 0,
    totalIncidents: 0,
    ausencias: 0,
    tardanzas: 0,
    errores: 0,
  }

  finalByPerson.forEach(p => {
    globalTotals.totalPoints += p.totals.puntos
    globalTotals.totalIncidents += p.incidents.length
    globalTotals.ausencias += p.totals.ausencias
    globalTotals.tardanzas += p.totals.tardanzas
    globalTotals.errores += p.totals.errores
  })

  return {
    month,
    byPerson: finalByPerson,
    totals: globalTotals,
  }
}

export function getPersonMonthlyDetail(
  personId: string,
  summary: MonthlySummary | null
): PersonMonthlySummary | null {
  if (!summary) return null
  return summary.byPerson.find(p => p.representativeId === personId) || null
}
