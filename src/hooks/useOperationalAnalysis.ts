/**
 * HOOK - ANÁLISIS OPERATIVO
 * 
 * Hook delgado para acceder al análisis operativo desde componentes React.
 * Sin lógica, solo conexión con el selector.
 */

import { useAppStore } from '@/store/useAppStore'
import {
    selectOperationalAnalysis,
    AnalysisParams,
} from '@/store/selectors/selectOperationalAnalysis'
import { OperationalAnalysis } from '@/domain/analysis/analysisTypes'

/**
 * Hook para obtener análisis operativo
 * 
 * @param params - Parámetros del análisis (base, mode, compared?) o null
 * @returns Análisis operativo completo o null si params es null
 */
export function useOperationalAnalysis(
    params: AnalysisParams | null
): OperationalAnalysis | null {
    return useAppStore(state =>
        params ? selectOperationalAnalysis(state, params) : null
    )
}
