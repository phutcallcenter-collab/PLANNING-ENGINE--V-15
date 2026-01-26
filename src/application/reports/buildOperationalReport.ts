import { Incident, Representative } from '@/domain/types'
import { calculatePoints } from '@/domain/analytics/computeMonthlySummary'
import {
    OperationalReport,
    PeriodDescriptor,
    PeriodMetrics,
    RepresentativeRisk,
} from '@/domain/reports/operationalTypes'
import {
    startOfMonth,
    endOfMonth,
    subMonths,
    subYears,
    format,
    startOfQuarter,
    endOfQuarter,
} from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Generar etiqueta de trimestre en formato "Ene-Mar 2026"
 */
function getQuarterLabel(date: Date): string {
    const quarter = Math.floor(date.getMonth() / 3)
    const year = format(date, 'yyyy')

    const quarterMonths = [
        'Ene-Mar',
        'Abr-Jun',
        'Jul-Sep',
        'Oct-Dic',
    ]

    return `${quarterMonths[quarter]} ${year}`
}

/**
 * Resumir métricas para un período específico
 */
function summarize(
    incidents: Incident[],
    from: string,
    to: string
): PeriodMetrics {
    const filtered = incidents.filter(i => i.startDate >= from && i.startDate <= to)

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
 * Calcular delta entre dos períodos
 */
function delta(a: PeriodMetrics, b: PeriodMetrics): PeriodMetrics {
    return {
        incidents: a.incidents - b.incidents,
        points: a.points - b.points,
        absences: a.absences - b.absences,
        licenses: a.licenses - b.licenses,
    }
}

/**
 * Constructor canónico del Reporte Operativo
 * 
 * REGLA INVARIANTE: Solo acepta MONTH o QUARTER como períodos base.
 * No permite rangos arbitrarios ni ventanas móviles.
 * 
 * @param reps - Representantes activos
 * @param incidents - Todos los incidentes
 * @param kind - Tipo de período: MONTH o QUARTER
 * @param anchorDate - Fecha de anclaje (típicamente "ahora")
 * @returns Reporte operativo completo con comparación dual
 */
export function buildOperationalReport(
    reps: Representative[],
    incidents: Incident[],
    kind: 'MONTH' | 'QUARTER',
    anchorDate: Date
): OperationalReport {
    // --------------------
    // Period definitions
    // --------------------
    const currentFrom =
        kind === 'MONTH'
            ? startOfMonth(anchorDate)
            : startOfQuarter(anchorDate)

    const currentTo =
        kind === 'MONTH'
            ? endOfMonth(anchorDate)
            : endOfQuarter(anchorDate)

    const prevFrom =
        kind === 'MONTH'
            ? subMonths(currentFrom, 1)
            : subMonths(currentFrom, 3)

    const prevTo =
        kind === 'MONTH'
            ? endOfMonth(prevFrom)
            : endOfQuarter(prevFrom)

    const yearAgoFrom = subYears(currentFrom, 1)
    const yearAgoTo = subYears(currentTo, 1)

    const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

    const currentPeriod: PeriodDescriptor = {
        kind,
        label:
            kind === 'MONTH'
                ? format(currentFrom, 'MMMM yyyy', { locale: es })
                : getQuarterLabel(currentFrom),
        from: fmt(currentFrom),
        to: fmt(currentTo),
    }

    const prevPeriod: PeriodDescriptor = {
        kind,
        label:
            kind === 'MONTH'
                ? format(prevFrom, 'MMMM yyyy', { locale: es })
                : getQuarterLabel(prevFrom),
        from: fmt(prevFrom),
        to: fmt(prevTo),
    }

    const yearAgoPeriod: PeriodDescriptor = {
        kind,
        label:
            kind === 'MONTH'
                ? format(yearAgoFrom, 'MMMM yyyy', { locale: es })
                : getQuarterLabel(yearAgoFrom),
        from: fmt(yearAgoFrom),
        to: fmt(yearAgoTo),
    }

    // --------------------
    // Metrics
    // --------------------
    const currentMetrics = summarize(incidents, currentPeriod.from, currentPeriod.to)
    const prevMetrics = summarize(incidents, prevPeriod.from, prevPeriod.to)
    const yearAgoMetrics = summarize(incidents, yearAgoPeriod.from, yearAgoPeriod.to)

    // --------------------
    // People risk
    // --------------------
    const byRep = new Map<string, { name: string; points: number }>()

    reps.filter(r => r.isActive !== false).forEach(r => {
        byRep.set(r.id, { name: r.name, points: 0 })
    })

    incidents.forEach(i => {
        if (i.startDate < currentPeriod.from || i.startDate > currentPeriod.to) return
        const entry = byRep.get(i.representativeId)
        if (!entry) return
        entry.points += calculatePoints(i)
    })

    const people = Array.from(byRep.entries()).map(([id, v]) => ({
        id,
        name: v.name,
        points: v.points,
    }))

    const needsAttention: RepresentativeRisk[] = people
        .filter(p => p.points > 0)
        .sort((a, b) => b.points - a.points)

    const topPerformers: RepresentativeRisk[] = people
        .filter(p => p.points === 0)
        .sort((a, b) => a.name.localeCompare(b.name))

    // --------------------
    // Reading
    // --------------------
    const reading =
        currentMetrics.incidents > prevMetrics.incidents
            ? 'El período muestra un deterioro operativo respecto al período anterior.'
            : 'El período muestra una mejora o estabilidad respecto al período anterior.'

    return {
        current: {
            period: currentPeriod,
            metrics: currentMetrics,
        },
        comparison: {
            previous: {
                period: prevPeriod,
                metrics: prevMetrics,
                delta: delta(currentMetrics, prevMetrics),
            },
            yearAgo: {
                period: yearAgoPeriod,
                metrics: yearAgoMetrics,
                delta: delta(currentMetrics, yearAgoMetrics),
            },
        },
        risk: {
            needsAttention,
            topPerformers,
        },
        shifts: {
            DAY: { incidents: 0, points: 0 },
            NIGHT: { incidents: 0, points: 0 },
        },
        topIncidents: [],
        reading,
    }
}
