// src/domain/analytics/types.ts
import type {
  Incident as RawIncident,
  IncidentType as DomainIncidentType,
} from '@/domain/incidents/types'

export type IncidentType = DomainIncidentType

export type RiskLevel = 'ok' | 'warning' | 'danger'

/**
 * Representa un incidente con sus puntos calculados.
 * Este es un objeto derivado usado dentro del resumen de analíticas.
 */
export interface IncidentWithPoints extends RawIncident {
  points: number
}

export interface PersonMonthlySummary {
  representativeId: string
  name: string

  // Totales
  totals: {
    ausencias: number
    tardanzas: number
    errores: number
    puntos: number
  }

  // Clasificación final
  riskLevel: RiskLevel

  // Para vistas detalladas, los incidentes ya vienen con sus puntos calculados.
  incidents: IncidentWithPoints[]
}

export interface MonthlySummary {
  month: string // YYYY-MM
  byPerson: PersonMonthlySummary[]
  totals: {
    totalPoints: number
    totalIncidents: number
    ausencias: number
    tardanzas: number
    errores: number
  }
}
