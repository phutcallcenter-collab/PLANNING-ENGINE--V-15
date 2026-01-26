
import { Incident, Representative, ShiftType } from '../../domain/types'
import { resolveIncidentDates } from '../../domain/incidents/resolveIncidentDates'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, format } from 'date-fns'

export type EnrichedIncident = Incident & {
    repName: string
    repShift?: ShiftType
    dayCount: number
    totalDuration: number
    returnDate: string
    progressRatio: number
}

// 🧠 CANONICAL HELPER: Logic for determining if an incident is "Ongoing" relative to a context date
export function enrichOngoingIncident(
    incident: Incident,
    rep: Representative,
    contextDateStr: string,
    allCalendarDays: any[] // Using any for CalendarDay to avoid circular dep for now, or import type if possible
): EnrichedIncident | null {

    if (incident.type !== 'VACACIONES' && incident.type !== 'LICENCIA') {
        return null
    }

    // If starts in future relative to context, not ongoing
    if (incident.startDate > contextDateStr) return null

    const resolved = resolveIncidentDates(
        incident,
        allCalendarDays,
        rep
    )

    // 🛑 No evento activo si no hay retorno definido
    if (!resolved.returnDate) return null

    // 🛑 No activo si ya terminó respecto al contexto
    if (resolved.returnDate <= contextDateStr) return null

    // 🛑 No activo si el contexto no está dentro del rango
    const index = resolved.dates.indexOf(contextDateStr)
    if (index < 0) return null

    const dayCount = index + 1
    const totalDuration = resolved.dates.length

    const progressRatio = totalDuration > 0 ? dayCount / totalDuration : 0

    return {
        ...incident,
        repName: rep.name,
        repShift: rep.baseShift,
        dayCount,
        totalDuration,
        returnDate: resolved.returnDate,
        progressRatio
    }
}
