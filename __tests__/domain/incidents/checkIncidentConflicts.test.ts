import { checkIncidentConflicts } from '@/domain/incidents/checkIncidentConflicts'
import { Incident, Representative, ISODate } from '@/domain/types'
import { DayInfo } from '@/domain/calendar/types'

describe('checkIncidentConflicts', () => {
  const mockRep: Representative = {
    id: 'rep1',
    name: 'Juan Pérez',
    baseShift: 'DAY',
    role: 'SALES',
    isActive: true,
    orderIndex: 0,
    baseSchedule: ['WORKING', 'WORKING', 'WORKING', 'WORKING', 'WORKING', 'OFF', 'OFF'], // Sat-Sun off
  }

  // Complete calendar for January 2025 (needed for resolveIncidentDates)
  const regularDays: DayInfo[] = [
    // Week 1
    { date: '2025-01-01', dayOfWeek: 3, kind: 'HOLIDAY', isSpecial: true }, // New Year
    { date: '2025-01-02', dayOfWeek: 4, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-03', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-04', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-05', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
    // Week 2
    { date: '2025-01-06', dayOfWeek: 1, kind: 'HOLIDAY', isSpecial: true }, // Three Kings Day
    { date: '2025-01-07', dayOfWeek: 2, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-08', dayOfWeek: 3, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-09', dayOfWeek: 4, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-10', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-11', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-12', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
    // Week 3
    { date: '2025-01-13', dayOfWeek: 1, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-14', dayOfWeek: 2, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-15', dayOfWeek: 3, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-16', dayOfWeek: 4, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-17', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-18', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-19', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
    // Week 4
    { date: '2025-01-20', dayOfWeek: 1, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-21', dayOfWeek: 2, kind: 'HOLIDAY', isSpecial: true }, // Altagracia
    { date: '2025-01-22', dayOfWeek: 3, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-23', dayOfWeek: 4, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-24', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-25', dayOfWeek: 6, kind: 'WORKING', isSpecial: false },
    { date: '2025-01-26', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
  ]

  it('should detect active vacation conflict', () => {
    const existingIncidents: Incident[] = [
      {
        id: '1',
        representativeId: 'rep1',
        type: 'VACACIONES',
        startDate: '2025-01-06',
        duration: 5, // 5 working days
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    const result = checkIncidentConflicts(
      'rep1',
      '2025-01-08', // Within vacation period
      'TARDANZA',
      1,
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('VACATION')
    expect(result.message).toContain('Ya tiene vacaciones activas')
  })

  it('should detect active license conflict', () => {
    const existingIncidents: Incident[] = [
      {
        id: '2',
        representativeId: 'rep1',
        type: 'LICENCIA',
        startDate: '2025-01-06',
        duration: 3, // 3 natural days
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    const result = checkIncidentConflicts(
      'rep1',
      '2025-01-07', // Within license period
      'AUSENCIA',
      1,
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('LICENSE')
    expect(result.message).toContain('Ya tiene licencia activa')
  })

  it('should detect vacation overlap with new vacation', () => {
    const existingIncidents: Incident[] = [
      {
        id: '3',
        representativeId: 'rep1',
        type: 'VACACIONES',
        startDate: '2025-01-10',
        duration: 3, // Jan 10, 13, 14
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    const result = checkIncidentConflicts(
      'rep1',
      '2025-01-08', // New vacation starting Jan 8
      'VACACIONES',
      4, // Jan 8, 9, 10, 13 (overlaps at Jan 10, 13)
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('OVERLAP')
    expect(result.message).toContain('Se solapa con vacaciones')
  })

  it('should detect license overlap with new license', () => {
    const existingIncidents: Incident[] = [
      {
        id: '4',
        representativeId: 'rep1',
        type: 'LICENCIA',
        startDate: '2025-01-10',
        duration: 3, // Jan 10, 11, 12
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    const result = checkIncidentConflicts(
      'rep1',
      '2025-01-09',
      'LICENCIA',
      4, // Jan 9, 10, 11, 12 (overlaps)
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('OVERLAP')
    expect(result.message).toContain('Se solapa con licencia')
  })

  it('should not detect conflict for different representative', () => {
    const existingIncidents: Incident[] = [
      {
        id: '6',
        representativeId: 'rep2', // Different rep
        type: 'VACACIONES',
        startDate: '2025-01-07',
        duration: 5,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    const result = checkIncidentConflicts(
      'rep1', // Our rep
      '2025-01-08',
      'TARDANZA',
      1,
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(false)
  })

  it('should not detect conflict when no vacations/licenses exist', () => {
    const existingIncidents: Incident[] = []

    const result = checkIncidentConflicts(
      'rep1',
      '2025-01-14',
      'VACACIONES',
      2,
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(false)
    expect(result.message).toBeUndefined()
  })

  it('should not flag conflict for simple incidents (TARDANZA, AUSENCIA, etc)', () => {
    const existingIncidents: Incident[] = [
      {
        id: '7',
        representativeId: 'rep1',
        type: 'TARDANZA',
        startDate: '2025-01-06',
        duration: 1,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    const result = checkIncidentConflicts(
      'rep1',
      '2025-01-06', // Same date, but TARDANZA doesn't block
      'AUSENCIA',
      1,
      existingIncidents,
      regularDays,
      mockRep
    )

    expect(result.hasConflict).toBe(false)
  })
})
