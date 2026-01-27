/**
 * Translation layer: Wizard state → Domain model
 * 
 * This function converts human-friendly wizard state into the domain's SpecialSchedule format.
 * One clean output. Zero magic. Zero ambiguity.
 */

import { ShiftAssignment, SpecialSchedule, DailyScheduleState } from '@/domain/types'
import { WizardState } from './wizardTypes'

/**
 * Helper function to convert daysOfWeek array and assignment to weeklyPattern
 */
function createWeeklyPattern(
    selectedDays: number[],
    assignment: ShiftAssignment
): SpecialSchedule['weeklyPattern'] {
    const pattern: SpecialSchedule['weeklyPattern'] = {
        0: 'OFF',
        1: 'OFF',
        2: 'OFF',
        3: 'OFF',
        4: 'OFF',
        5: 'OFF',
        6: 'OFF',
    };

    let dayState: DailyScheduleState;
    
    if (assignment.type === 'NONE') {
        dayState = 'OFF';
    } else if (assignment.type === 'BOTH') {
        dayState = 'MIXTO';
    } else if (assignment.type === 'SINGLE') {
        dayState = assignment.shift;
    } else {
        dayState = 'OFF';
    }

    // Set the selected days to the determined state
    selectedDays.forEach(day => {
        pattern[day as 0 | 1 | 2 | 3 | 4 | 5 | 6] = dayState;
    });

    return pattern;
}

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
            const disablePattern = createWeeklyPattern(daysToDisable, { type: 'NONE' });
            schedules.push({
                scope: 'INDIVIDUAL',
                targetId: representativeId,
                from: state.startDate,
                to: state.endDate,
                weeklyPattern: disablePattern,
                note: 'Reemplazo de días mixtos base',
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
    const mainPattern = createWeeklyPattern(state.days, assignment);
    schedules.push({
        scope: 'INDIVIDUAL',
        targetId: representativeId,
        from: state.startDate,
        to: state.endDate,
        weeklyPattern: mainPattern,
        note: state.note || undefined,
    })

    return schedules
}
