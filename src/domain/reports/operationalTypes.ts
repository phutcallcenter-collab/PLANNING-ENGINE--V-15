/**
 * REPORTE OPERATIVO - TIPOS INSTITUCIONALES
 * 
 * Arquitectura canónica con períodos institucionales (mes/trimestre).
 * A prueba de idiotas: no permite rangos arbitrarios ni ventanas móviles.
 */

/**
 * Tipo de período institucional
 */
export type PeriodKind = 'MONTH' | 'QUARTER'

/**
 * Descriptor de período con label humano
 */
export interface PeriodDescriptor {
    kind: PeriodKind
    label: string              // "Enero 2026", "Q1 2026"
    from: string               // ISODate
    to: string                 // ISODate
}

/**
 * Métricas de un período
 * Ausencias/Licencias = count-only (días irrelevantes)
 */
export interface PeriodMetrics {
    incidents: number
    points: number
    absences: number           // Count-only
    licenses: number           // Count-only
}

/**
 * Bloque de comparación con período, métricas y delta
 */
export interface PeriodComparisonBlock {
    period: PeriodDescriptor
    metrics: PeriodMetrics
    delta: PeriodMetrics       // current - this.period
}

/**
 * Información de riesgo por representante
 */
export interface RepresentativeRisk {
    id: string
    name: string
    points: number
}

/**
 * Estructura completa del Reporte Operativo
 */
export interface OperationalReport {
    current: {
        period: PeriodDescriptor
        metrics: PeriodMetrics
    }

    comparison: {
        previous: PeriodComparisonBlock
        yearAgo: PeriodComparisonBlock
    }

    risk: {
        needsAttention: RepresentativeRisk[]
        topPerformers: RepresentativeRisk[]
    }

    shifts: {
        DAY: { incidents: number; points: number }
        NIGHT: { incidents: number; points: number }
    }

    topIncidents: {
        type: string
        count: number
        points: number
    }[]

    reading: string
}
