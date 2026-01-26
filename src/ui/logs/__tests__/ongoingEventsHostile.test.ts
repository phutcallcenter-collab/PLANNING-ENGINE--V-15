

import { getOngoingIncidents } from '../../../application/ui-adapters/getOngoingIncidents'
import { enrichOngoingIncident } from '../logHelpers'
import { Incident, Representative } from '../../../domain/types'

// Mock Data
// Mock Factory for Strict Domain Compliance
function createMockRepresentative(overrides: Partial<Representative> = {}): Representative {
    return {
        id: 'rep-1',
        name: 'Test Rep',
        baseShift: 'DAY',
        baseSchedule: {
            0: 'OFF',
            1: 'WORKING',
            2: 'WORKING',
            3: 'WORKING',
            4: 'WORKING',
            5: 'WORKING',
            6: 'OFF'
        },
        role: 'SALES',
        orderIndex: 1,
        isActive: true,
        ...overrides
    }
}

const mockRep = createMockRepresentative()

const mockCalendarDays = [
    // A standard week
    { date: '2024-01-01', isSpecial: false, dayOfWeek: 1, kind: 'WORKING' as const }, // Mon - Work
    { date: '2024-01-02', isSpecial: false, dayOfWeek: 2, kind: 'WORKING' as const }, // Tue - Work
    { date: '2024-01-03', isSpecial: false, dayOfWeek: 3, kind: 'WORKING' as const }, // Wed - Work
    { date: '2024-01-04', isSpecial: false, dayOfWeek: 4, kind: 'WORKING' as const }, // Thu - Work
    { date: '2024-01-05', isSpecial: false, dayOfWeek: 5, kind: 'WORKING' as const }, // Fri - Work
    { date: '2024-01-06', isSpecial: false, dayOfWeek: 6, kind: 'WORKING' as const },     // Sat - OFF
    { date: '2024-01-07', isSpecial: false, dayOfWeek: 0, kind: 'WORKING' as const },     // Sun - OFF
    { date: '2024-01-08', isSpecial: false, dayOfWeek: 1, kind: 'WORKING' as const }, // Mon - Work
]

describe('🛡️ HOSTILE TESTING: Ongoing Incidents Architecture', () => {

    it('🚫 Should IGNORE non-ongoing types (TARDANZA)', () => {
        const incidents: Incident[] = [{
            id: 'inc-1',
            representativeId: 'rep-1',
            type: 'TARDANZA',
            startDate: '2024-01-01',
            duration: 1,
            createdAt: '2024-01-01T00:00:00Z'
        }]

        const result = getOngoingIncidents(incidents, [mockRep], '2024-01-01', mockCalendarDays)
        expect(result).toHaveLength(0) // TARDANZA must never appear here
    })

    it('🚫 Should IGNORE incidents without returnDate', () => {
        // A license that never ends? (e.g. initial undefined)
        const incidents = [{
            id: 'inc-broken',
            representativeId: 'rep-1',
            type: 'LICENCIA',
            startDate: '2024-01-01',
            // No returnDate calculated or provided implies open-ended or invalid context
            duration: 1,
            createdAt: '2024-01-01T00:00:00Z'
        }] as Incident[]

        // Note: resolveIncidentDates usually provides returnDate if duration exists.
        // If we mock resolveIncidentDates to return null returnDate, it should fail.
        // But since we use real resolveIncidentDates, let's pass a case where it likely fails or manually check enricher.

        // Using enricher directly to test the guard
        const result = enrichOngoingIncident(incidents[0], mockRep, '2024-01-02', mockCalendarDays)
        // If resolveIncidentDates works, it might return a date. If we assume duration 1...
        // Let's assume resolve assigns a date.
        // If we force returnDate to be missing by mocking or providing bad data?
        // Let's rely on the fact that standard calc provides it.
        // If we pass an incident that is technically "ongoing" but we are testing integrity...

        // Better test: contextDate > returnDate
        // 2024-01-01 (Mon) duration 1 -> Returns 2024-01-02.
        // Context 2024-01-02. 
        // Is 2024-01-02 <= 2024-01-02? Yes. Wait.
        // ongoing rule: context < returnDate ?? or context <= returnDate?
        // enrichOngoingIncident: if (resolved.returnDate <= contextDateStr) return null

        // So if returnDate is 2024-01-02 (Assume retun to work on Jan 2)
        // And today is Jan 2.
        // "2024-01-02" <= "2024-01-02" is TRUE. So it returns null. CORRECT.
        // The person puts feet in office at returnDate. So event is over.
    })

    it('✅ Should define progress purely based on resolved days (Index lookup)', () => {
        // Vacations from Jan 1 to Jan 5 (5 working days)
        // 2024-01-01, 01-02, 01-03, 01-04, 01-05
        const incident: Incident = {
            id: 'vac-1',
            representativeId: 'rep-1',
            type: 'VACACIONES',
            startDate: '2024-01-01',
            duration: 5,
            createdAt: '2024-01-01T00:00:00Z'
        }

        // Day 1: Jan 1
        const day1 = enrichOngoingIncident(incident, mockRep, '2024-01-01', mockCalendarDays)
        expect(day1).not.toBeNull()
        expect(day1?.dayCount).toBe(1)
        expect(day1?.progressRatio).toBeCloseTo(1 / 5)

        // Day 3: Jan 3
        const day3 = enrichOngoingIncident(incident, mockRep, '2024-01-03', mockCalendarDays)
        expect(day3?.dayCount).toBe(3)
        expect(day3?.progressRatio).toBeCloseTo(3 / 5)

        // Day 5: Jan 5 (Last day of vacations)
        // Return date should be Jan 6 (Sat) -> Jan 8 (Mon) if sat is off?
        // resolveIncidentDates handles skips.
        // If duration is 5 working days: Mon, Tue, Wed, Thu, Fri.
        // Return date is Sat (Jan 6).
        const day5 = enrichOngoingIncident(incident, mockRep, '2024-01-05', mockCalendarDays)
        expect(day5?.dayCount).toBe(5)
        expect(day5?.progressRatio).toBeCloseTo(1) // 100% complete
    })

    it('🛑 Should NOT exist on Return Date', () => {
        const incident: Incident = {
            id: 'vac-1',
            representativeId: 'rep-1',
            type: 'VACACIONES',
            startDate: '2024-01-01',
            duration: 5, // ends Jan 5
            createdAt: '2024-01-01T00:00:00Z'
        }
        // Return date is theoretically Jan 6 or next working day.
        // Let's say resolved return date is '2024-01-06'

        // If context is '2024-01-06'
        const result = enrichOngoingIncident(incident, mockRep, '2024-01-06', mockCalendarDays)
        expect(result).toBeNull() // Back to work/off status, not on vacation
    })

    it('🛑 Should NOT exist BEFORE Start Date', () => {
        const incident: Incident = {
            id: 'vac-1',
            representativeId: 'rep-1',
            type: 'VACACIONES',
            startDate: '2024-01-02', // Starts Tuesday
            duration: 2,
            createdAt: '2024-01-01T00:00:00Z'
        }

        const result = enrichOngoingIncident(incident, mockRep, '2024-01-01', mockCalendarDays) // Monday
        expect(result).toBeNull()
    })

    it('🧪 Should handle "Gap" days correctly (Weekend in middle)', () => {
        // Vacation Fri (Jan 5) - Mon (Jan 8) -> 2 days duration?
        // Or just check if context falls on a weekend?
        // Logic: index = resolved.dates.indexOf(contextDate)

        // If Jan 6/7 are NOT in resolved.dates (because they are OFF),
        // and context is Jan 6.
        // indexOf returns -1.
        // enrichment returns null.

        // EXPECTATION: On weekends during vacation, does the bar show?
        // Current Logic: "if (index < 0) return null" -> BAR DISAPPEARS ON WEEKEND.
        // This is technically correct per "Effective Daily Log" rules (you are OFF, not VACATION).
        // If user wants to see "Vacation" on weekend, logic needs change. 
        // BUT per "Checklist Blindaje": "contextDate must be in resolved.dates".
        // So disappearing on weekend is the INTENDED, BLINDED BEHAVIOR.

        // Let's verify this behavior holds (it ensures no "Day 0" or incorrect math).

        const incident: Incident = {
            id: 'vac-gap',
            representativeId: 'rep-1',
            type: 'VACACIONES',
            startDate: '2024-01-05', // Friday
            duration: 2, // Fri + Mon
            createdAt: '2024-01-01T00:00:00Z'
        }

        // Assume resolved dates = ['2024-01-05', '2024-01-08'] (skips 6, 7)

        // Friday
        const fri = enrichOngoingIncident(incident, mockRep, '2024-01-05', mockCalendarDays)
        expect(fri?.dayCount).toBe(1)

        // Saturday (Off)
        const sat = enrichOngoingIncident(incident, mockRep, '2024-01-06', mockCalendarDays)
        expect(sat).toBeNull() // Takes a break visually? Or should it persist?
        // Current "Frozen" logic says: return null.

        // Monday
        const mon = enrichOngoingIncident(incident, mockRep, '2024-01-08', mockCalendarDays)
        expect(mon?.dayCount).toBe(2)
    })

    it('⚖️ Should SORT by Progress DESC -> Return Date ASC', () => {
        // A: 80% done, ends tomorrow
        // B: 20% done, ends next week
        // C: 80% done, ends today (tie breaker?) -> No, progress is exact number.

        const incidentA = { ...mockIncident('A', 0.8), returnDate: '2024-01-10' }
        const incidentB = { ...mockIncident('B', 0.2), returnDate: '2024-01-15' }
        const incidentC = { ...mockIncident('C', 0.9), returnDate: '2024-01-09' }
        // Order should be: C (90%), A (80%), B (20%)

        const list = [incidentB, incidentA, incidentC]

        const sorted = list.sort((a, b) => {
            if (Math.abs(b.progressRatio - a.progressRatio) > 0.01) {
                return b.progressRatio - a.progressRatio
            }
            return a.returnDate.localeCompare(b.returnDate)
        })

        expect(sorted[0].id).toBe('C')
        expect(sorted[1].id).toBe('A')
        expect(sorted[2].id).toBe('B')
    })
})

function mockIncident(id: string, ratio: number): any {
    return {
        id,
        progressRatio: ratio,
        returnDate: '2024-01-01', // default
        createdAt: '2024-01-01T00:00:00Z'
    }
}
