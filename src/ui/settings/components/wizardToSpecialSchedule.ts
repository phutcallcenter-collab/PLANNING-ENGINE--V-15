/**
 * Translation layer: Wizard state → Domain model
 * 
 * This function converts human-friendly wizard state into the domain's SpecialSchedule format.
 * One clean output. Zero magic. Zero ambiguity.
 */

import { ShiftAssignment, SpecialSchedule } from '@/domain/types'
import { WizardState } from './wizardTypes'

export function wizardToSpecialSchedule(
    state: WizardState,
    representativeId: string,
    baseMixedDays: number[] = []
): Omit<SpecialSchedule, 'id'>[] {
    // Validation: ensure all required fields are present
    if (!state.intent) {
        throw new Error('Debe seleccionar qué pasará en esos días')
    }

    if (!state.startDate || !state.endDate) {
        throw new Error('Debe especificar el período (fechas de inicio y fin)')
    }

    if (state.days.length === 0) {
        throw new Error('Debe seleccionar al menos un día de la semana')
    }

    const schedules: Omit<SpecialSchedule, 'id'>[] = []

    // Special case: mixed shift that REPLACES base mixed days
    if (
        state.intent === 'WORK_BOTH_SHIFTS' &&
        state.replaceBaseMixedDays === true &&
        baseMixedDays.length > 0
    ) {
        const daysToDisable = baseMixedDays.filter(
            d => !state.days.includes(d)
        )

        if (daysToDisable.length > 0) {
            schedules.push({
                representativeId,
                startDate: state.startDate,
                endDate: state.endDate,
                daysOfWeek: daysToDisable,
                assignment: { type: 'NONE' },
                reason: 'Reemplazo de días mixtos base',
            })
        }
    }

    // Translate intent to domain assignment
    let assignment: ShiftAssignment

    switch (state.intent) {
        case 'WORK_SINGLE_SHIFT':
            if (!state.shift) {
                throw new Error('Debe seleccionar el turno específico')
            }
            assignment = { type: 'SINGLE', shift: state.shift }
            break

        case 'WORK_BOTH_SHIFTS':
            assignment = { type: 'BOTH' }
            break

        case 'OFF':
            assignment = { type: 'NONE' }
            break
    }

    // Main schedule (what user selected)
    schedules.push({
        representativeId,
        startDate: state.startDate,
        endDate: state.endDate,
        daysOfWeek: state.days,
        assignment,
        reason: state.note || undefined,
    })

    return schedules
}
