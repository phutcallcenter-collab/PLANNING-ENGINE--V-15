/**
 * MODO ANÁLISIS - BUILDER CANÓNICO
 * 
 * Constructor del análisis operativo con comparación dirigida.
 * Separado del reporte institucional automático.
 * 
 * Responsabilidades:
 * - Validar granularidad (MONTH vs MONTH, QUARTER vs QUARTER)
 * - Calcular métricas para ambos períodos
 * - Calcular deltas
 * - Identificar riesgo
 * - Generar comparación por turnos
 * - Generar lectura analítica
 * 
 * NO decide qué comparar (eso es responsabilidad del selector).
 */

import { Incident, Representative } from '@/domain/types'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'
import {
    OperationalAnalysis,
    AnalysisPeriod,
    PeriodMetrics,
    PeriodBlock,
    PeriodComparisonBlock,
    RepresentativeRisk,
    ShiftComparison,
    ComparisonMode,
} from '@/domain/analysis/analysisTypes'

/**
 * Resumir métricas para un período específico
 */
function summarizePeriod(
    period: AnalysisPeriod,
    incidents: Incident[]
): PeriodMetrics {
    const filtered = incidents.filter(
        i => i.startDate >= period.from && i.startDate <= period.to
    )

    let incidentsCount = 0
    let points = 0
    let absences = 0
    let licenses = 0

    filtered.forEach(i => {
        const p = calculatePoints(i)
        if (p > 0) {
            incidentsCount++
            points += p
        }
        if (i.type === 'AUSENCIA') absences++
        if (i.type === 'LICENCIA') licenses++
    })

    return { incidents: incidentsCount, points, absences, licenses }
}

/**
 * Calcular delta entre dos métricas
 */
function delta(base: PeriodMetrics, compared: PeriodMetrics): PeriodMetrics {
    return {
        incidents: base.incidents - compared.incidents,
        points: base.points - compared.points,
        absences: base.absences - compared.absences,
        licenses: base.licenses - compared.licenses,
    }
}

/**
 * Resumir métricas por turno
 */
function summarizeByShift(
    period: AnalysisPeriod,
    incidents: Incident[],
    reps: Representative[],
    shift: 'DAY' | 'NIGHT'
): PeriodMetrics {
    const repIds = new Set(
        reps.filter(r => r.baseShift === shift && r.isActive !== false).map(r => r.id)
    )

    const filtered = incidents.filter(
        i =>
            i.startDate >= period.from &&
            i.startDate <= period.to &&
            repIds.has(i.representativeId)
    )

    let incidentsCount = 0
    let points = 0
    let absences = 0
    let licenses = 0

    filtered.forEach(i => {
        const p = calculatePoints(i)
        if (p > 0) {
            incidentsCount++
            points += p
        }
        if (i.type === 'AUSENCIA') absences++
        if (i.type === 'LICENCIA') licenses++
    })

    return { incidents: incidentsCount, points, absences, licenses }
}

/**
 * Identificar representantes en riesgo
 */
function computeRisk(
    period: AnalysisPeriod,
    incidents: Incident[],
    reps: Representative[]
): { needsAttention: RepresentativeRisk[]; topPerformers: RepresentativeRisk[] } {
    const byRep = new Map<string, { name: string; points: number }>()

    reps.filter(r => r.isActive !== false).forEach(r => {
        byRep.set(r.id, { name: r.name, points: 0 })
    })

    incidents.forEach(i => {
        if (i.startDate < period.from || i.startDate > period.to) return
        const entry = byRep.get(i.representativeId)
        if (!entry) return
        entry.points += calculatePoints(i)
    })

    const people = Array.from(byRep.entries()).map(([id, v]) => ({
        id,
        name: v.name,
        points: v.points,
    }))

    const needsAttention = people
        .filter(p => p.points > 0)
        .sort((a, b) => b.points - a.points)

    const topPerformers = people
        .filter(p => p.points === 0)
        .sort((a, b) => a.name.localeCompare(b.name))

    return { needsAttention, topPerformers }
}

/**
 * Generar lectura analítica mejorada
 * 
 * Incluye:
 * - Porcentajes de cambio
 * - Identificación de concentración por turno
 * - Sugerencias de investigación
 */
function buildReading(
    base: PeriodMetrics,
    compared: PeriodMetrics,
    comparisonMode: ComparisonMode,
    shifts: ShiftComparison[]
): string {
    const deltaIncidents = base.incidents - compared.incidents
    const deltaPoints = base.points - compared.points

    const modeLabel =
        comparisonMode === 'PREVIOUS'
            ? 'el período anterior'
            : comparisonMode === 'YEAR_AGO'
                ? 'el mismo período del año anterior'
                : 'el período comparado'

    // Calcular porcentajes (evitar división por cero)
    const incidentsPercent = compared.incidents > 0
        ? Math.round((deltaIncidents / compared.incidents) * 100)
        : deltaIncidents > 0 ? 100 : 0

    const pointsPercent = compared.points > 0
        ? Math.round((deltaPoints / compared.points) * 100)
        : deltaPoints > 0 ? 100 : 0

    // Analizar concentración por turno
    const dayDelta = shifts.find(s => s.shift === 'DAY')?.delta.incidents || 0
    const nightDelta = shifts.find(s => s.shift === 'NIGHT')?.delta.incidents || 0
    const totalDelta = Math.abs(dayDelta) + Math.abs(nightDelta)

    let shiftConcentration = ''
    if (totalDelta > 0) {
        const dayConcentration = Math.round((Math.abs(dayDelta) / totalDelta) * 100)
        const nightConcentration = Math.round((Math.abs(nightDelta) / totalDelta) * 100)

        if (dayConcentration > 60) {
            shiftConcentration = ` El turno día concentra el ${dayConcentration}% del cambio.`
        } else if (nightConcentration > 60) {
            shiftConcentration = ` El turno noche concentra el ${nightConcentration}% del cambio.`
        }
    }

    // Generar lectura según tendencia
    if (deltaIncidents > 0 || deltaPoints > 0) {
        // Deterioro
        const parts = [`Se observa un deterioro operativo respecto a ${modeLabel}.`]

        if (deltaIncidents > 0) {
            parts.push(
                `Las incidencias aumentaron en ${deltaIncidents} (${incidentsPercent > 0 ? '+' : ''}${incidentsPercent}%).`
            )
        }

        if (deltaPoints > 0) {
            parts.push(
                `Los puntos punitivos aumentaron en ${deltaPoints} (${pointsPercent > 0 ? '+' : ''}${pointsPercent}%).`
            )
        }

        if (shiftConcentration) {
            parts.push(shiftConcentration)
        }

        // Sugerencia de investigación
        if (nightDelta > dayDelta && nightDelta > 0) {
            parts.push('Se recomienda revisar cobertura y calidad en turno nocturno.')
        } else if (dayDelta > nightDelta && dayDelta > 0) {
            parts.push('Se recomienda revisar cobertura y calidad en turno diurno.')
        } else if (deltaIncidents > 5) {
            parts.push('Se recomienda análisis de causas raíz.')
        }

        return parts.join(' ')
    } else if (deltaIncidents < 0 || deltaPoints < 0) {
        // Mejora
        const parts = [`Se observa una mejora operativa respecto a ${modeLabel}.`]

        if (deltaIncidents < 0) {
            parts.push(
                `Las incidencias disminuyeron en ${Math.abs(deltaIncidents)} (${incidentsPercent}%).`
            )
        }

        if (deltaPoints < 0) {
            parts.push(
                `Los puntos punitivos disminuyeron en ${Math.abs(deltaPoints)} (${pointsPercent}%).`
            )
        }

        if (shiftConcentration) {
            parts.push(shiftConcentration)
        }

        return parts.join(' ')
    } else {
        // Estabilidad
        return `El período muestra estabilidad respecto a ${modeLabel}. No se observan cambios significativos en las métricas operativas.`
    }
}

/**
 * Constructor canónico del Análisis Operativo
 * 
 * REGLA INVARIANTE: Solo acepta períodos de la misma granularidad.
 * 
 * @param reps - Representantes activos
 * @param incidents - Todos los incidentes
 * @param basePeriod - Período base a analizar
 * @param comparedPeriod - Período con el que comparar
 * @param comparisonMode - Tipo de comparación (para lectura)
 * @returns Análisis operativo completo con comparación dirigida
 * @throws Error si los períodos tienen distinta granularidad
 * @throws Error si se intenta comparar el mismo período consigo mismo
 */
export function buildOperationalAnalysis(
    reps: Representative[],
    incidents: Incident[],
    basePeriod: AnalysisPeriod,
    comparedPeriod: AnalysisPeriod,
    comparisonMode: ComparisonMode = 'CUSTOM'
): OperationalAnalysis {
    // Validación dura: misma granularidad
    if (basePeriod.kind !== comparedPeriod.kind) {
        throw new Error(
            `Cannot compare ${basePeriod.kind} vs ${comparedPeriod.kind}. Periods must have the same granularity.`
        )
    }

    // Validación dura: no comparar mismo período consigo mismo
    if (basePeriod === comparedPeriod) {
        throw new Error(
            'Cannot compare a period with itself. Base and compared periods must be different references.'
        )
    }

    // Validación dura: no comparar períodos idénticos (mismo rango temporal)
    if (basePeriod.from === comparedPeriod.from && basePeriod.to === comparedPeriod.to) {
        throw new Error(
            `Cannot compare identical periods. Base: ${basePeriod.label}, Compared: ${comparedPeriod.label}`
        )
    }

    // Métricas globales
    const baseMetrics = summarizePeriod(basePeriod, incidents)
    const comparedMetrics = summarizePeriod(comparedPeriod, incidents)

    // Métricas por turno
    const dayBase = summarizeByShift(basePeriod, incidents, reps, 'DAY')
    const dayCompared = summarizeByShift(comparedPeriod, incidents, reps, 'DAY')

    const nightBase = summarizeByShift(basePeriod, incidents, reps, 'NIGHT')
    const nightCompared = summarizeByShift(comparedPeriod, incidents, reps, 'NIGHT')

    const shifts: ShiftComparison[] = [
        {
            shift: 'DAY',
            base: dayBase,
            compared: dayCompared,
            delta: delta(dayBase, dayCompared),
        },
        {
            shift: 'NIGHT',
            base: nightBase,
            compared: nightCompared,
            delta: delta(nightBase, nightCompared),
        },
    ]

    // Riesgo
    const risk = computeRisk(basePeriod, incidents, reps)

    // Lectura (con análisis de turnos)
    const reading = buildReading(baseMetrics, comparedMetrics, comparisonMode, shifts)

    return {
        base: {
            period: basePeriod,
            metrics: baseMetrics,
        },
        compared: {
            period: comparedPeriod,
            metrics: comparedMetrics,
            delta: delta(baseMetrics, comparedMetrics),
        },
        comparisonMode,
        risk,
        shifts,
        reading,
    }
}
