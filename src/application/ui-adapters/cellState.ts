// src/application/ui-adapters/cellState.ts

export type VisualVariant =
    | 'WORKING'
    | 'OFF'
    | 'VACATION'
    | 'LICENSE'
    | 'HOLIDAY'
    | 'ABSENT'
    | 'ABSENT_JUSTIFIED'

/**
 * UI CONTRACT — DO NOT BREAK
 *
 * One color = one truth
 * - WORKING: trabaja / trabajó (verde, sin label)
 * - OFF: libre habitual
 * - VACATION: vacaciones
 * - LICENSE: licencia
 * - HOLIDAY: feriado trabajado
 * - ABSENT: ausencia (siempre rojo)
 */
export interface ResolvedCellState {
    variant: VisualVariant
    label?: string
    tooltip: string
    ariaLabel: string
    canEdit: boolean
    canContextMenu: boolean
}
