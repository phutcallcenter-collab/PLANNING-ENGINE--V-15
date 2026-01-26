import { isBefore, isAfter } from 'date-fns'
import { parseLocalDate } from '@/domain/calendar/parseLocalDate'
import type { Incident, Representative, DayInfo } from '@/domain/types'
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { EnrichedIncident } from '@/ui/logs/logHelpers'

export function getOngoingIncidents(
    incidents: Incident[],
    representatives: Representative[],
    contextDate: string, // ISO yyyy-MM-dd
    allCalendarDays: DayInfo[]
): EnrichedIncident[] {
    const context = parseLocalDate(contextDate)
    const repMap = new Map(representatives.map(r => [r.id, r]))

    return incidents
        .filter(i => i.type === 'LICENCIA' || i.type === 'VACACIONES')
        .map(incident => {
            const rep = repMap.get(incident.representativeId)
            if (!rep) return null

            const resolved = resolveIncidentDates(
                incident,
                allCalendarDays,
                rep
            )

            if (!resolved?.dates?.length) return null

            const start = parseLocalDate(resolved.dates[0])
            const end = parseLocalDate(resolved.dates[resolved.dates.length - 1])

            // 🛡️ CANONICAL FILTER: must be active *today*
            if (isBefore(context, start) || isAfter(context, end)) {
                return null
            }

            const dayIndex = resolved.dates.findIndex(d => d === contextDate)
            if (dayIndex === -1) return null

            const dayCount = dayIndex + 1
            const totalDuration = resolved.dates.length

            return {
                ...incident,
                repName: rep.name,
                repShift: rep.baseShift,
                dayCount,
                totalDuration,
                progressRatio: dayCount / totalDuration,
                returnDate: resolved.returnDate,
            } as EnrichedIncident
        })
        .filter((i): i is EnrichedIncident => i !== null)
        // 🧠 ORDER BY REALITY, NOT CREATION
        .sort((a, b) => {
            if (b.progressRatio !== a.progressRatio) {
                return b.progressRatio - a.progressRatio
            }
            return a.totalDuration - b.totalDuration
        })
}
