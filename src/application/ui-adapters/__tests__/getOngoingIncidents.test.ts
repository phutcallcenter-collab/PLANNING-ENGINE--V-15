import { getOngoingIncidents } from '../getOngoingIncidents'
import type { Incident, Representative, DayInfo } from '@/domain/types'

const reps: Representative[] = [
    {
        id: 'r1',
        name: 'Ana',
        baseShift: 'DAY',
        isActive: true,
        baseSchedule: ['OFF', 'DAY', 'DAY', 'DAY', 'DAY', 'DAY', 'OFF']
    } as any as Representative,
]

const calendarDays = Array.from({ length: 31 }, (_, i) => {
    const dateStr = `2026-01-${String(i + 1).padStart(2, '0')}`
    return {
        date: dateStr,
        kind: 'WORKDAY',
        dayOfWeek: new Date(dateStr).getUTCDay(),
        isSpecial: false
    }
}) as unknown as DayInfo[]

function license(start: string, duration: number): Incident {
    return {
        id: 'id-' + Math.random().toString(36),
        representativeId: 'r1',
        type: 'LICENCIA',
        startDate: start,
        duration,
    } as Incident
}

describe('getOngoingIncidents – hostile tests', () => {

    test('does NOT return finished events', () => {
        const incidents = [license('2026-01-01', 3)]
        const res = getOngoingIncidents(
            incidents,
            reps,
            '2026-01-10',
            calendarDays
        )
        expect(res).toHaveLength(0)
    })

    test('returns event only while active', () => {
        const incidents = [license('2026-01-05', 5)]
        const res = getOngoingIncidents(
            incidents,
            reps,
            '2026-01-07',
            calendarDays
        )
        expect(res).toHaveLength(1)
        expect(res[0].dayCount).toBe(3)
        expect(res[0].totalDuration).toBe(5)
    })

    test('progress advances with date', () => {
        const incidents = [license('2026-01-01', 4)]

        const d1 = getOngoingIncidents(incidents, reps, '2026-01-01', calendarDays)[0]
        const d3 = getOngoingIncidents(incidents, reps, '2026-01-03', calendarDays)[0]

        expect(d1.progressRatio).toBeCloseTo(0.25)
        expect(d3.progressRatio).toBeCloseTo(0.75)
    })

    test('orders by most advanced first', () => {
        const incidents = [
            license('2026-01-01', 10), // day 5 = 0.5
            license('2026-01-03', 4),  // day 3 = 0.75
        ]

        const res = getOngoingIncidents(
            incidents,
            reps,
            '2026-01-05',
            calendarDays
        )

        expect(res[0].totalDuration).toBe(4)
        expect(res[1].totalDuration).toBe(10)
    })

    test('same progress → shorter duration first', () => {
        const incidents = [
            license('2026-01-01', 4), // day 2/4 = 0.5
            license('2026-01-02', 6), // day 3/6 = 0.5
        ]

        const res = getOngoingIncidents(
            incidents,
            reps,
            '2026-01-02',
            calendarDays
        )

        expect(res[0].totalDuration).toBe(4)
    })

})
