import { AppState } from '../useAppStore'
import { buildOperationalReport } from '@/application/reports/buildOperationalReport'
import { OperationalReport } from '@/domain/reports/operationalTypes'

/**
 * Selector para el Reporte Operativo
 * 
 * Arquitectura institucional: solo acepta MONTH o QUARTER.
 * El anchorDate es siempre "ahora".
 * 
 * @param state - Estado global de la aplicación
 * @param kind - Tipo de período: MONTH o QUARTER
 * @returns Reporte operativo con comparación dual
 */
export function selectOperationalReport(
    state: AppState,
    kind: 'MONTH' | 'QUARTER'
): OperationalReport | null {
    const { representatives, incidents } = state

    if (!representatives || !incidents) {
        return null
    }

    const anchorDate = new Date()

    return buildOperationalReport(representatives, incidents, kind, anchorDate)
}
