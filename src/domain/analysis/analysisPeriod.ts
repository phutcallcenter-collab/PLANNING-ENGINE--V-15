/**
 * MODO ANÁLISIS - HELPERS DE PERÍODO
 * 
 * Funciones puras para construcción y manipulación de períodos institucionales.
 * Validación dura: falla si los datos son inválidos.
 * 
 * Responsabilidades:
 * - Crear períodos válidos (MONTH/QUARTER)
 * - Calcular período anterior
 * - Calcular mismo período año anterior
 * - Generar labels humanos en español
 */

import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, format } from 'date-fns'
import { AnalysisPeriod, PeriodKind } from './analysisTypes'
import { parseLocalDate } from '../calendar/parseLocalDate'

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * Convierte Date a ISO string (yyyy-MM-dd)
 */
function toISODate(date: Date): string {
    return format(date, 'yyyy-MM-dd')
}

/**
 * Crea un período de análisis válido
 * 
 * @throws Error si month no está en rango 0-11
 * @throws Error si quarter no está en rango 1-4
 * @throws Error si year es NaN o negativo
 * @throws Error si kind es inválido
 */
export function createAnalysisPeriod(input:
    | { kind: 'MONTH'; year: number; month: number }          // month: 0–11
    | { kind: 'QUARTER'; year: number; quarter: 1 | 2 | 3 | 4 }
): AnalysisPeriod {
    // Validación de kind
    const kind = input.kind
    if (kind !== 'MONTH' && kind !== 'QUARTER') {
        throw new Error(`Invalid kind: ${kind}. Must be MONTH or QUARTER`)
    }

    // Validación de year
    const year = input.year
    if (isNaN(year) || !isFinite(year)) {
        throw new Error(`Invalid year: ${year}. Must be a valid number`)
    }

    if (year < 0) {
        throw new Error(`Invalid year: ${year}. Must be positive`)
    }

    if (kind === 'MONTH') {
        const month = (input as { kind: 'MONTH'; year: number; month: number }).month

        if (month < 0 || month > 11) {
            throw new Error(`Invalid month: ${month}. Must be 0–11`)
        }

        // Validación adicional: month debe ser entero
        if (!Number.isInteger(month)) {
            throw new Error(`Invalid month: ${month}. Must be an integer`)
        }

        const date = new Date(year, month, 1)

        return {
            kind: 'MONTH',
            year,
            label: `${MONTHS[month]} ${year}`,
            from: toISODate(startOfMonth(date)),
            to: toISODate(endOfMonth(date)),
        }
    }

    // QUARTER
    const quarter = (input as { kind: 'QUARTER'; year: number; quarter: 1 | 2 | 3 | 4 }).quarter

    if (![1, 2, 3, 4].includes(quarter)) {
        throw new Error(`Invalid quarter: ${quarter}. Must be 1–4`)
    }

    const startMonth = (quarter - 1) * 3
    const date = new Date(year, startMonth, 1)

    const startLabel = MONTHS[startMonth].slice(0, 3)
    const endLabel = MONTHS[startMonth + 2].slice(0, 3)

    return {
        kind: 'QUARTER',
        year,
        label: `${startLabel}–${endLabel} ${year}`,
        from: toISODate(startOfQuarter(date)),
        to: toISODate(endOfQuarter(date)),
    }
}

/**
 * Calcula el período inmediatamente anterior
 * 
 * Ejemplos:
 * - Enero 2026 → Diciembre 2025
 * - Marzo 2026 → Febrero 2026
 * - Ene–Mar 2026 → Oct–Dic 2025
 * - Abr–Jun 2026 → Ene–Mar 2026
 */
export function getPreviousPeriod(period: AnalysisPeriod): AnalysisPeriod {
    if (period.kind === 'MONTH') {
        const date = parseLocalDate(period.from)
        const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)

        return createAnalysisPeriod({
            kind: 'MONTH',
            year: prevDate.getFullYear(),
            month: prevDate.getMonth(),
        })
    }

    // QUARTER
    const date = parseLocalDate(period.from)
    const prevDate = new Date(date.getFullYear(), date.getMonth() - 3, 1)
    const quarter = Math.floor(prevDate.getMonth() / 3) + 1

    return createAnalysisPeriod({
        kind: 'QUARTER',
        year: prevDate.getFullYear(),
        quarter: quarter as 1 | 2 | 3 | 4,
    })
}

/**
 * Calcula el mismo período del año anterior
 * 
 * Ejemplos:
 * - Enero 2026 → Enero 2025
 * - Ene–Mar 2026 → Ene–Mar 2025
 */
export function getYearAgoPeriod(period: AnalysisPeriod): AnalysisPeriod {
    if (period.kind === 'MONTH') {
        const date = parseLocalDate(period.from)

        return createAnalysisPeriod({
            kind: 'MONTH',
            year: date.getFullYear() - 1,
            month: date.getMonth(),
        })
    }

    // QUARTER
    const date = parseLocalDate(period.from)
    const quarter = Math.floor(date.getMonth() / 3) + 1

    return createAnalysisPeriod({
        kind: 'QUARTER',
        year: date.getFullYear() - 1,
        quarter: quarter as 1 | 2 | 3 | 4,
    })
}
