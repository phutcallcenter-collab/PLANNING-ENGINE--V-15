import { ISODate, Incident, Representative } from '@/domain/types'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { DayInfo } from '@/domain/calendar/types'
import { ManagerWeeklyPlan } from '@/domain/management/types'
import { EffectiveManagerDay } from './types'

export function resolveEffectiveManagerDay(
    managerPlan: ManagerWeeklyPlan | null,
    incidents: Incident[],
    date: ISODate,
    allCalendarDays: DayInfo[],
    representative?: Representative
): EffectiveManagerDay {
    // 1. INCIDENCIAS (Solo si hay representante vinculado)
    if (representative) {
        const blockingIncident = incidents.find(i => {
            if (i.representativeId !== representative.id) return false
            if (!['VACACIONES', 'LICENCIA'].includes(i.type)) return false
            const resolved = resolveIncidentDates(i, allCalendarDays, representative)
            return resolved.dates.includes(date)
        })

        if (blockingIncident) {
            return {
                kind: blockingIncident.type === 'VACACIONES' ? 'VACATION' : 'LICENSE',
                note: blockingIncident.note,
            }
        }
    }

    // 2. OVERRIDE / PLAN
    const plannedDay = managerPlan?.days?.[date]

    if (plannedDay && plannedDay.duty !== undefined) {
        if (plannedDay.duty === 'OFF') {
            return {
                kind: 'OFF',
                note: plannedDay.note
            }
        }

        if (plannedDay.duty) {
            return {
                kind: 'DUTY',
                duty: plannedDay.duty,
                note: plannedDay.note,
            }
        }

        // duty is null -> Explicitly Empty (User cleared it)
        return {
            kind: 'EMPTY',
            note: plannedDay.note,
        }
    }

    // 3. NO PLAN, NO INCIDENT -> EMPTY
    return {
        kind: 'EMPTY',
    }
}
