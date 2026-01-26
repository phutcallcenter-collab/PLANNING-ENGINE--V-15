/**
 * SELECTOR - ANÁLISIS OPERATIVO
 * 
 * Traduce intención de usuario en análisis concreto.
 * 
 * Responsabilidades:
 * - Interpretar modo de comparación (PREVIOUS/YEAR_AGO/CUSTOM)
 * - Calcular período comparado según modo
 * - Llamar al builder con períodos válidos
 * 
 * NO calcula métricas, solo traduce intención.
 */

import { AppState } from '../useAppStore'
import { buildOperationalAnalysis } from '@/application/analysis/buildOperationalAnalysis'
import {
    getPreviousPeriod,
    getYearAgoPeriod,
} from '@/domain/analysis/analysisPeriod'
import {
    AnalysisPeriod,
    OperationalAnalysis,
    ComparisonMode,
} from '@/domain/analysis/analysisTypes'

/**
 * Parámetros del selector
 */
export interface AnalysisParams {
    base: AnalysisPeriod
    mode: ComparisonMode
    compared?: AnalysisPeriod  // Requerido solo si mode === 'CUSTOM'
}

/**
 * Selector canónico del análisis operativo
 * 
 * @param state - Estado global de la aplicación
 * @param params - Parámetros del análisis
 * @returns Análisis operativo completo
 * @throws Error si mode === 'CUSTOM' y no se provee compared
 */
export function selectOperationalAnalysis(
    state: AppState,
    params: AnalysisParams
): OperationalAnalysis {
    const { base, mode, compared: customCompared } = params

    let compared: AnalysisPeriod

    switch (mode) {
        case 'PREVIOUS':
            compared = getPreviousPeriod(base)
            break

        case 'YEAR_AGO':
            compared = getYearAgoPeriod(base)
            break

        case 'CUSTOM':
            if (!customCompared) {
                throw new Error('Custom comparison requires a compared period')
            }
            compared = customCompared
            break

        default:
            throw new Error(`Unknown comparison mode: ${mode}`)
    }

    return buildOperationalAnalysis(
        state.representatives,
        state.incidents,
        base,
        compared,
        mode
    )
}
