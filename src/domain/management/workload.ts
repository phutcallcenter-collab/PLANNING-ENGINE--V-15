export type ManagerDutyKind = 'DAY' | 'NIGHT' | 'INTER' | 'MONITOR'

export interface DutyDefinition {
    hours: number
    label: string
}

export function getDutyHours(
    duty: string, // Using string to accept widely typed inputs from UI
    dayOfWeek: number // 0 = domingo, 6 = sábado
): DutyDefinition {
    // Normalize input just in case
    const upperDuty = duty.toUpperCase() as ManagerDutyKind
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 // viernes o sábado

    switch (upperDuty) {
        case 'DAY':
            return { hours: 7, label: 'Día (9–4)' }

        case 'NIGHT':
            return {
                hours: isWeekend ? 8 : 7,
                label: isWeekend ? 'Noche extendida' : 'Noche'
            }

        case 'INTER':
            return { hours: 5, label: 'Intermedio (2–7)' }

        case 'MONITOR':
            return { hours: 3, label: 'Monitoreo' }

        default:
            return { hours: 0, label: 'Sin turno' }
    }
}
