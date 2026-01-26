import { ISODate, IncidentType } from '@/domain/types'

export type ExecutivePeriod = {
  from: string // ISODate
  to: string   // ISODate
}

export type ExecutiveKPI = {
  totalIncidents: number
  totalPoints: number
}

export type ShiftStats = {
  DAY: {
    incidents: number
    points: number
  }
  NIGHT: {
    incidents: number
    points: number
  }
}

export type IncidentTypeStats = {
  type: IncidentType
  count: number
  points: number
}

export type ExecutivePersonSummary = {
  repId: string
  name: string
  shift: 'DAY' | 'NIGHT'
  incidents: number
  points: number
}

export interface ExecutiveReport {
  period: ExecutivePeriod
  kpis: ExecutiveKPI
  shifts: ShiftStats
  incidentTypes: IncidentTypeStats[]
  candidates: ExecutivePersonSummary[]
  needsAttention: ExecutivePersonSummary[]
}
