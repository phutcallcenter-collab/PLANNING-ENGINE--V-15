/**
 * MODO ANÁLISIS OPERATIVO - TIPOS CANÓNICOS
 * 
 * Arquitectura institucional para análisis histórico dirigido.
 * Separación total del Modo Institucional (reporte automático).
 * 
 * Principios:
 * - Períodos explícitos (MONTH/QUARTER)
 * - Comparación dirigida (A vs B)
 * - Count-only para ausencias/licencias
 * - Sin rangos arbitrarios
 */

/**
 * Tipo de período institucional
 */
export type PeriodKind = 'MONTH' | 'QUARTER'

/**
 * Descriptor de período con label humano
 */
export interface AnalysisPeriod {
    kind: PeriodKind
    year: number
    label: string          // "Enero 2026" | "Ene–Mar 2026"
    from: string           // ISO yyyy-MM-dd
    to: string             // ISO yyyy-MM-dd
}

/**
 * Métricas de un período
 * Ausencias/Licencias = count-only (días irrelevantes)
 */
export interface PeriodMetrics {
    incidents: number
    points: number
    absences: number     // COUNT ONLY
    licenses: number     // COUNT ONLY
}

/**
 * Bloque de período con métricas
 */
export interface PeriodBlock {
    period: AnalysisPeriod
    metrics: PeriodMetrics
}

/**
 * Bloque de comparación con delta
 */
export interface PeriodComparisonBlock extends PeriodBlock {
    delta: PeriodMetrics  // base - compared
}

/**
 * Tipo de comparación
 */
export type ComparisonMode = 'PREVIOUS' | 'YEAR_AGO' | 'CUSTOM'

/**
 * Información de riesgo por representante
 */
export interface RepresentativeRisk {
    id: string
    name: string
    points: number
}

/**
 * Comparación por turno (solo en Modo Análisis)
 */
export interface ShiftComparison {
    shift: 'DAY' | 'NIGHT'
    base: PeriodMetrics
    compared: PeriodMetrics
    delta: PeriodMetrics
}

/**
 * Resultado completo del Modo Análisis
 */
export interface OperationalAnalysis {
    base: PeriodBlock
    compared: PeriodComparisonBlock
    comparisonMode: ComparisonMode

    risk: {
        needsAttention: RepresentativeRisk[]
        topPerformers: RepresentativeRisk[]
    }

    shifts: ShiftComparison[]

    reading: string
}
