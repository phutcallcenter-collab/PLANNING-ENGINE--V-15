import {
  ExecutiveReport,
  ExecutivePersonSummary,
} from './types'
import { Incident, Representative } from '@/domain/types'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'

function round(n: number) {
  return Math.round(n * 10) / 10
}

function summarizeShift(
  list: ExecutivePersonSummary[],
  shift: 'DAY' | 'NIGHT'
) {
  const filtered = list.filter(p => p.shift === shift)
  if (filtered.length === 0) {
    return { incidents: 0, points: 0 }
  }
  const points = filtered.reduce((a, p) => a + p.points, 0)
  return {
    incidents: filtered.reduce((a, p) => a + p.incidents, 0),
    points,
  }
}

function summarizeByType(incidents: Incident[]) {
  const map = new Map()
  incidents.forEach(i => {
    const prev = map.get(i.type) || { type: i.type, count: 0, points: 0 }
    prev.count++
    prev.points += calculatePoints(i)
    map.set(i.type, prev)
  })
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}


export function computeExecutiveReport(
  reps: Representative[],
  incidents: Incident[],
  from: string,
  to: string
): ExecutiveReport {
  const activeReps = reps.filter(r => r.isActive !== false)

  const windowIncidents = incidents.filter(i =>
    i.startDate >= from && i.startDate <= to
  )

  const byRep = new Map<string, ExecutivePersonSummary>()

  activeReps.forEach(r => {
    byRep.set(r.id, {
      repId: r.id,
      name: r.name,
      shift: r.baseShift,
      incidents: 0,
      points: 0,
    })
  })

  windowIncidents.forEach(i => {
    const entry = byRep.get(i.representativeId)
    if (!entry) return
    const points = calculatePoints(i)
    if (points > 0) {
      entry.incidents++
      entry.points += points
    }
  })

  const people = Array.from(byRep.values())

  const totalIncidents = people.reduce((sum, p) => sum + p.incidents, 0)
  const totalPoints = people.reduce((sum, p) => sum + p.points, 0)

  const shiftStats = {
    DAY: summarizeShift(people, 'DAY'),
    NIGHT: summarizeShift(people, 'NIGHT'),
  }

  const incidentTypes = summarizeByType(windowIncidents.filter(i => calculatePoints(i) > 0))

  return {
    period: { from, to },
    kpis: {
      totalIncidents,
      totalPoints,
    },
    shifts: shiftStats,
    incidentTypes,
    candidates: people.filter(p => p.incidents === 0).sort((a, b) => a.name.localeCompare(b.name)),
    needsAttention: people
      .filter(p => p.points > 0)
      .sort((a, b) => b.points - a.points),
  }
}
