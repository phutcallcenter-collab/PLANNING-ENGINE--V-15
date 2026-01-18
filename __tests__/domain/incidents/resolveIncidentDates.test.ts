
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { Incident, Representative, DayInfo } from '@/domain/types'

describe('Domain Logic Bugs Reproduction', () => {

  // Setup for Rep: Works Mon-Fri
  const mockRep: Representative = {
    id: 'r1',
    name: 'Test Rep',
    baseSchedule: { 0: 'OFF', 1: 'DAY', 2: 'DAY', 3: 'DAY', 4: 'DAY', 5: 'DAY', 6: 'OFF' }, // Sun=0, Sat=6
    baseShift: 'DAY',
    role: 'SALES',
    isActive: true,
    orderIndex: 1
  }

  const createDay = (date: string, kind: 'Day' | 'HOLIDAY' | 'Weekend', note: string): DayInfo => ({
    date,
    dayOfWeek: new Date(date + 'T00:00:00Z').getUTCDay(),
    kind: kind === 'Day' || kind === 'Weekend' ? 'WORKING' : 'HOLIDAY', // Note: Domain DayInfo kind is WORKING | HOLIDAY usually
    isSpecial: kind === 'HOLIDAY',
  })

  // Helper to map simplified kind to domain kind
  const mapKind = (k: string): any => k === 'HOLIDAY' ? 'HOLIDAY' : 'WORKING'

  const calendarCheck: DayInfo[] = [
    { date: '2025-01-03', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-04', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-05', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-06', dayOfWeek: 1, kind: 'HOLIDAY', isSpecial: true },
    { date: '2025-01-07', dayOfWeek: 2, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-08', dayOfWeek: 3, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-09', dayOfWeek: 4, kind: 'WORKING', isSpecial: false },
  ]

  describe('Feature: License Calculation', () => {
    it('BUG 1 REPRO: LICENCIA should count strictly calendar days (including holidays/weekends)', () => {
      // Setup: 5 day license starting Friday Jan 3.
      // Expected: Jan 3, 4, 5, 6, 7 (5 days continuous)

      const license: Incident = {
        id: 'inc-lic',
        representativeId: 'r1',
        type: 'LICENCIA',
        startDate: '2025-01-03',
        duration: 5,
        createdAt: new Date().toISOString()
      }

      const result = resolveIncidentDates(license, calendarCheck, mockRep)

      console.log('License Dates:', result.dates)

      expect(result.dates).toHaveLength(5)
      expect(result.dates).toEqual([
        '2025-01-03',
        '2025-01-04',
        '2025-01-05',
        '2025-01-06',
        '2025-01-07'
      ])
      // Return should be next WORKING day: Jan 8
      expect(result.returnDate).toBe('2025-01-08')
    })

    it('BUG 1 EDGE CASE: Should calculate return date correctly when license ends before a long weekend', () => {
      // License ends Fri 17th.
      // Sat 18 (Off), Sun 19 (Off), Mon 20 (Holiday).
      // Return should be Tue 21.

      const calendarComplex: DayInfo[] = [
        { date: '2025-01-17', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
        { date: '2025-01-18', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
        { date: '2025-01-19', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
        { date: '2025-01-20', dayOfWeek: 1, kind: 'HOLIDAY', isSpecial: true },
        { date: '2025-01-21', dayOfWeek: 2, kind: 'WORKING', isSpecial: false },
      ]

      const license: Incident = {
        id: 'lic-complex',
        representativeId: 'r1',
        type: 'LICENCIA',
        startDate: '2025-01-17',
        duration: 1,
        createdAt: new Date().toISOString()
      }

      const result = resolveIncidentDates(license, calendarComplex, mockRep)

      expect(result.dates).toEqual(['2025-01-17'])
      expect(result.returnDate).toBe('2025-01-21')
    })
  })

  describe('Feature: Vacation Calculation', () => {
    it('VACACIONES should count only working days (skipping holidays/weekends)', () => {
      // Setup: 5 day vacation starting Friday Jan 3.
      // Expected: Jan 3 (Fri), Jan 7 (Tue), Jan 8 (Wed), Jan 9 (Thu), Jan 10 (Fri)
      // Skipping Sat 4, Sun 5, Mon 6 (Holiday)

      // Need extended calendar
      const extendedCalendar: DayInfo[] = [
        ...calendarCheck,
        { date: '2025-01-10', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
        { date: '2025-01-11', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
        { date: '2025-01-12', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
        { date: '2025-01-13', dayOfWeek: 1, kind: 'WORKING', isSpecial: false },
      ]

      const vacation: Incident = {
        id: 'inc-vac',
        representativeId: 'r1',
        type: 'VACACIONES',
        startDate: '2025-01-03',
        duration: 5,
        createdAt: new Date().toISOString()
      }

      const result = resolveIncidentDates(vacation, extendedCalendar, mockRep)

      console.log('Vacation Dates:', result.dates)

      expect(result.dates).toHaveLength(5)
      expect(result.dates).toEqual([
        '2025-01-03',
        // SKIPS 4, 5, 6
        '2025-01-07',
        '2025-01-08',
        '2025-01-09',
        '2025-01-10'
      ])

      // Return next working day: Mon 13
      expect(result.returnDate).toBe('2025-01-13')
    })
  })
})
