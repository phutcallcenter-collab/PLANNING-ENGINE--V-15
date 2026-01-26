import { ManagerDuty } from './types'
import { parseISO } from 'date-fns'

// 🧠 MODO ANÁLISIS: Pesos Analíticos de Fricción (Micro)
// Estos pesos son para detección de patrones, no para cálculo de carga nominal.
// Exageran la diferencia para resaltar el impacto biológico/social.
const ANALYSIS_SHIFT_WEIGHTS: Record<string, number> = {
    DAY: 2,
    INTER: 1.5,
    MONITOR: 1,
    // NIGHT se calcula dinámicamente según día
}

const NIGHT_BASE_WEIGHT = 3
const NIGHT_WEEKEND_WEIGHT = 4 // Fri/Sat Night

// 🛡️ DEFINICIÓN DE ESTRUCTURA
export type StructuralBalanceStatus =
    | 'STABLE'
    | 'UNBALANCED'
    | 'STRUCTURALLY_UNFAIR'

export interface ManagerLoadContext {
    managerId: string
    name: string
    // Raw metrics derived from schedule
    weeklyLoad: number // Carga operativa ya calculada (input)
    shifts: {
        date: string
        type: ManagerDuty
    }[]
}

export interface OffenderDetails {
    managerId: string
    name: string
    deviation: number // Puntos sobre el promedio
    structuralScore: number // Score de fricción específica de esta semana
    reasons: string[]
}

export interface StructuralWeekAnalysis {
    status: StructuralBalanceStatus
    fairnessScore: number // 0-100 (0=Perfect, 100=Toxic)
    metrics: {
        avgLoad: number
        stdDev: number
        maxLoad: number
        minLoad: number
    }
    offenders: OffenderDetails[]
    explanation: string
}

// 🧠 MOTOR DE ANÁLISIS
export function analyzeStructuralBalance(
    managerContexts: ManagerLoadContext[]
): StructuralWeekAnalysis {
    if (managerContexts.length < 2) {
        return createEmptyAnalysis()
    }

    // 1. Estadísticas Macro (Based on provided WeeklyLoad input)
    const loads = managerContexts.map(m => m.weeklyLoad)
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length

    // Variance & StdDev
    const squareDiffs = loads.map(value => {
        const diff = value - avgLoad
        return diff * diff
    })
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
    const stdDev = Math.sqrt(avgSquareDiff)

    const maxLoad = Math.max(...loads)
    const minLoad = Math.min(...loads)

    // 2. Análisis Micro por Manager (Patrones y Fricción)
    const offenders: OffenderDetails[] = []
    let globalStabilityPenalty = 0

    managerContexts.forEach(manager => {
        const reasons: string[] = []
        let frictionScore = 0 // Acumulador interno para score analítico

        // A. Desbalance Estadístico
        // if load > avg + 1.5 * std -> CRITICAL
        if (manager.weeklyLoad > avgLoad + (1.5 * stdDev) && stdDev > 2) {
            reasons.push(`Carga crítica (+${(manager.weeklyLoad - avgLoad).toFixed(1)} pts sobre media)`)
        } else if (manager.weeklyLoad > avgLoad + stdDev && stdDev > 2) {
            reasons.push(`Carga superior al promedio (+${(manager.weeklyLoad - avgLoad).toFixed(1)} pts)`)
        }

        // B. Concentración de Fricción (Micro Analysis)
        let nightShifts = 0
        let weekendNights = 0

        manager.shifts.forEach(shift => {
            const dayOfWeek = parseISO(shift.date).getDay() // 0=Sun

            if (shift.type === 'NIGHT') {
                nightShifts++
                // Friday(5) or Saturday(6) -> High friction
                if (dayOfWeek === 5 || dayOfWeek === 6) {
                    weekendNights++
                    frictionScore += NIGHT_WEEKEND_WEIGHT
                } else {
                    frictionScore += NIGHT_BASE_WEIGHT
                }
            } else if (shift.type) {
                frictionScore += ANALYSIS_SHIFT_WEIGHTS[shift.type] ?? 1
            }
        })

        // Regla de concentración: >=3 nights && >=1 weekend night
        if (nightShifts >= 3 && weekendNights >= 1) {
            reasons.push('Patrón nocturno de alta fricción (3+ noches con fin de semana)')
            globalStabilityPenalty += 30 // Penalización fuerte al score global
        }

        // Regla de fin de semana puro: Viernes + Sábado Noche
        if (weekendNights >= 2) {
            reasons.push('Fin de semana completo nocturno (Viernes y Sábado)')
            globalStabilityPenalty += 20
        }

        // Si hay razones, es un offender
        if (reasons.length > 0) {
            offenders.push({
                managerId: manager.managerId,
                name: manager.name,
                deviation: manager.weeklyLoad - avgLoad,
                structuralScore: frictionScore,
                reasons
            })
        }
    })

    // 3. Cálculo de Structural Score (0-100)
    // fairnessScore = statisticalFactor + imbalanceFactor + frictionPenalty

    // Factor estadístico: Cuántos stdDevs se aleja el peor caso
    // capped at 40 pts
    const worstDeviation = Math.max(0, maxLoad - avgLoad)
    const statisticalFactor = stdDev > 0 ? Math.min((worstDeviation / stdDev) * 20, 40) : 0

    // Factor de desbalance interno: diferencia min-max
    // if max - min >= 6 -> structural issue. 
    // 1 pt diff = 3 score pts. Max 30.
    const spread = maxLoad - minLoad
    const imbalanceFactor = Math.min(spread * 3, 30)

    // Total Score
    let fairnessScore = statisticalFactor + imbalanceFactor + globalStabilityPenalty
    fairnessScore = Math.min(Math.max(fairnessScore, 0), 100) // Clamp 0-100

    // 4. Determinación de Status
    let status: StructuralBalanceStatus = 'STABLE'
    if (fairnessScore > 65 || offenders.some(o => o.reasons.some(r => r.includes('Patrón nocturno')))) {
        status = 'STRUCTURALLY_UNFAIR'
    } else if (fairnessScore > 40) {
        status = 'UNBALANCED'
    }

    // 5. Generación de Explicación Humana
    let explanation = 'Distribución de carga dentro de parámetros normales.'

    if (status !== 'STABLE') {
        const mainOffender = offenders.sort((a, b) => b.deviation - a.deviation)[0]
        if (mainOffender) {
            explanation = `La semana presenta un ${status === 'STRUCTURALLY_UNFAIR' ? 'desbalance estructural' : 'desbalance notable'}. ` +
                `${mainOffender.name} acumula desviaciones significativas (${mainOffender.reasons.join(', ')}), ` +
                `mientras el promedio del equipo se mantiene en ${avgLoad.toFixed(1)}.`
        } else {
            explanation = `Se detecta un desbalance en la distribución (Spread: ${spread.toFixed(1)} pts), aunque sin concentración crítica individual.`
        }
    }

    return {
        status,
        fairnessScore,
        metrics: {
            avgLoad,
            stdDev,
            maxLoad,
            minLoad
        },
        offenders,
        explanation
    }
}

function createEmptyAnalysis(): StructuralWeekAnalysis {
    return {
        status: 'STABLE',
        fairnessScore: 0,
        metrics: { avgLoad: 0, stdDev: 0, maxLoad: 0, minLoad: 0 },
        offenders: [],
        explanation: 'Insuficientes datos para análisis.'
    }
}
