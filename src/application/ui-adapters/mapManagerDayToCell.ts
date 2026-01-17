import { EffectiveManagerDay, ManagerVisualState } from './types'

export interface ManagerCellState {
    state: ManagerVisualState
    label: string
    tooltip?: string
    isEditable: boolean
    note?: string
}

export function mapManagerDayToCell(
    day: EffectiveManagerDay,
    name: string
): ManagerCellState {
    if (day.kind === 'VACATION') {
        return {
            state: 'VACACIONES',
            label: 'VAC',
            tooltip: day.note ? `Vacaciones\n📝 ${day.note}` : 'Vacaciones',
            isEditable: false,
            note: day.note // Add note mapping
        }
    }

    if (day.kind === 'LICENSE') {
        return {
            state: 'LICENCIA',
            label: 'LIC',
            tooltip: day.note ? `Licencia\n📝 ${day.note}` : 'Licencia',
            isEditable: false,
            note: day.note // Add note mapping
        }
    }

    if (day.kind === 'EMPTY') {
        const note = day.note
        return {
            state: 'EMPTY',
            label: '—',
            tooltip: note ? `📝 ${note}` : undefined,
            isEditable: true,
            note: note // Add note mapping
        }
    }

    if (day.kind === 'OFF') {
        return {
            state: 'OFF',
            label: 'OFF',
            tooltip: 'Día Libre (Sin asignación)',
            isEditable: true,
            note: day.note // Add note mapping
        }
    }

    // DUTY
    const duty = day.duty!
    const labels: Record<string, string> = {
        DAY: 'Día',
        NIGHT: 'Noche',
        INTER: 'Intermedio',
        MONITORING: 'Monitoreo',
    }

    // Variant mapping
    let visualState: ManagerVisualState = 'EMPTY'
    switch (duty) {
        case 'DAY': visualState = 'DAY'; break;
        case 'NIGHT': visualState = 'NIGHT'; break;
        case 'INTER': visualState = 'INTER'; break;
        case 'MONITORING': visualState = 'MONITOR'; break;
    }

    return {
        state: visualState,
        label: labels[duty] || duty,
        tooltip: day.note
            ? `${labels[duty] || duty}\n📝 ${day.note}`
            : undefined,
        isEditable: true,
        note: day.note // Add note mapping
    }
}
