import { Incident, Representative } from '@/domain/types'
import { isWithinInterval, parseISO } from 'date-fns'

export interface ExecutiveSummaryInput {
  representatives: Representative[]
  incidents: Incident[]
  startDate: Date
  endDate: Date
}

export interface RepSummary {
  id: string
  name: string
  shift: 'DAY' | 'NIGHT'
  totalIncidents: number
  incidentTypes: Record<string, number>
}

export interface ExecutiveSummaryResult {
  totalIncidents: number
  incidentsByType: { type: string; count: number }[]
  incidentsByShift: { day: number; night: number }
  topPerformers: RepSummary[]
  needsAttention: RepSummary[]
}

const PUNITIVE_INCIDENT_TYPES: Array<Incident['type']> = [
  'AUSENCIA',
  'TARDANZA',
  'ERROR',
  'OTRO',
]

export function getExecutiveSummary(
  input: ExecutiveSummaryInput
): ExecutiveSummaryResult {
  const { representatives, incidents, startDate, endDate } = input

  const relevantIncidents = incidents.filter(
    i =>
      PUNITIVE_INCIDENT_TYPES.includes(i.type) &&
      isWithinInterval(parseISO(i.startDate), {
        start: startDate,
        end: endDate,
      })
  )

  const repMap = new Map(representatives.map(r => [r.id, r]))
  const summaryByRep: Record<string, RepSummary> = {}

  for (const rep of representatives) {
    if (rep.isActive === false) continue
    summaryByRep[rep.id] = {
      id: rep.id,
      name: rep.name,
      shift: rep.baseShift,
      totalIncidents: 0,
      incidentTypes: {},
    }
  }

  const incidentsByType: Record<string, number> = {}
  const incidentsByShift = { day: 0, night: 0 }

  for (const incident of relevantIncidents) {
    const rep = repMap.get(incident.representativeId)
    if (!rep || !summaryByRep[rep.id]) continue

    summaryByRep[rep.id].totalIncidents++
    summaryByRep[rep.id].incidentTypes[incident.type] =
      (summaryByRep[rep.id].incidentTypes[incident.type] || 0) + 1

    incidentsByType[incident.type] = (incidentsByType[incident.type] || 0) + 1

    if (rep.baseShift === 'DAY') {
      incidentsByShift.day++
    } else {
      incidentsByShift.night++
    }
  }

  const allRepSummaries = Object.values(summaryByRep)

  const sortedByIncidents = [...allRepSummaries].sort(
    (a, b) => a.totalIncidents - b.totalIncidents
  )

  return {
    totalIncidents: relevantIncidents.length,
    incidentsByType: Object.entries(incidentsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    incidentsByShift,
    topPerformers: sortedByIncidents.slice(0, 5),
    needsAttention: sortedByIncidents.slice(-5).reverse(),
  }
}
