import { validateIncident } from '../../../src/domain/incidents/validateIncident'
import { canRegisterOnDate } from '../../../src/domain/incidents/canRegisterOnDate'
import type { Incident, Representative, DayInfo } from '../../../src/domain/types'
import { format, addDays, subDays } from 'date-fns'

jest.mock('../../../src/domain/incidents/canRegisterOnDate', () => ({
  canRegisterOnDate: jest.fn(),
}))

describe('Domain Rules: Incident Validation', () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const futureDate = format(addDays(new Date(), 5), 'yyyy-MM-dd')
  const pastDate = format(subDays(new Date(), 5), 'yyyy-MM-dd')

  const mockRep: Representative = {
    id: 'rep-1',
    name: 'Test Rep',
    baseShift: 'DAY',
    baseSchedule: {},
    role: 'SALES',
    isActive: true,
    orderIndex: 0,
  }
  const mockAllReps = [mockRep]
  const mockCalendar: DayInfo[] = [
    { date: today, dayOfWeek: 3, kind: 'WORKING', isSpecial: false },
    { date: futureDate, dayOfWeek: 1, kind: 'WORKING', isSpecial: false },
    { date: pastDate, dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
  ]

  beforeEach(() => {
    // Reset mocks before each test
    (canRegisterOnDate as jest.Mock).mockClear();
    (canRegisterOnDate as jest.Mock).mockReturnValue({ ok: true });
  });

  afterEach(() => {
    // Restore all mocks to prevent test interference
    jest.restoreAllMocks();
  });

  describe('canRegisterOnDate (Date-based Rules)', () => {
    // We un-mock the function for this specific test suite
    jest.unmock('../../../src/domain/incidents/canRegisterOnDate');
    const { canRegisterOnDate: originalCanRegisterOnDate } = jest.requireActual('../../../src/domain/incidents/canRegisterOnDate');

    it('[HARDENING] should NOT allow registering punitive incidents in the future', () => {
      const resultAusencia = originalCanRegisterOnDate('AUSENCIA', futureDate, today)
      const resultTardanza = originalCanRegisterOnDate('TARDANZA', futureDate, today)
      const resultError = originalCanRegisterOnDate('ERROR', futureDate, today)

      expect(resultAusencia.ok).toBe(false)
      expect(resultTardanza.ok).toBe(false)
      expect(resultError.ok).toBe(false)
    })

    it('[HARDENING] should allow registering VACACIONES in the future', () => {
      const result = originalCanRegisterOnDate('VACACIONES', futureDate, today)
      expect(result.ok).toBe(true)
    })

    it('should allow registering any incident on a past or present date', () => {
      const types: Incident['type'][] = ['AUSENCIA', 'TARDANZA', 'LICENCIA', 'VACACIONES']
      for (const type of types) {
        const pastResult = originalCanRegisterOnDate(type, pastDate, today)
        const todayResult = originalCanRegisterOnDate(type, today, today)
        expect(pastResult.ok).toBe(true)
        expect(todayResult.ok).toBe(true)
      }
    })
  })

  describe('validateIncident (Interaction Rules)', () => {
    it('[HARDENING] should always allow an OVERRIDE incident', () => {
      // Setup a scenario that would normally fail (e.g., overlap with vacation)
      const existing: Incident[] = [{
        id: 'vac-1',
        representativeId: 'rep-1',
        type: 'VACACIONES',
        startDate: today,
        duration: 5,
        createdAt: '2024-01-01T00:00:00Z'
      }];

      const newIncident: Incident = {
        id: 'ov-1',
        type: 'OVERRIDE',
        representativeId: 'rep-1',
        startDate: today,
        duration: 1,
        createdAt: new Date().toISOString(),
      }

      const result = validateIncident(newIncident, existing, mockCalendar, mockRep, mockAllReps);

      // Even with the overlap, OVERRIDE should be considered valid by this function.
      expect(result.ok).toBe(true)
    });

    it('should fail if canRegisterOnDate fails', () => {
      (canRegisterOnDate as jest.Mock).mockReturnValue({ ok: false, code: 'TEST_FAIL', message: 'Test' });

      const newIncident: Incident = {
        id: 'inc-1',
        type: 'AUSENCIA',
        representativeId: 'rep-1',
        startDate: futureDate,
        duration: 1,
        createdAt: new Date().toISOString(),
      }

      const result = validateIncident(newIncident, [], mockCalendar, mockRep, mockAllReps);

      expect(canRegisterOnDate).toHaveBeenCalledWith('AUSENCIA', futureDate, expect.any(String))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe('TEST_FAIL')
      }
    });

    it('should fail if trying to add an incident on a day with an existing AUSENCIA', () => {
      const existing: Incident[] = [{
        id: 'abs-1',
        representativeId: 'rep-1',
        type: 'AUSENCIA',
        startDate: today,
        duration: 1,
        createdAt: '2024-01-01T00:00:00Z'
      }];

      const newIncident: Incident = {
        id: 'tardy-1',
        type: 'TARDANZA',
        representativeId: 'rep-1',
        startDate: today,
        duration: 1,
        createdAt: new Date().toISOString(),
      }

      const result = validateIncident(newIncident, existing, mockCalendar, mockRep, mockAllReps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('BLOCKED_BY_ABSENCE');
      }
    });

    it('should fail if there is an overlap with existing VACACIONES', () => {
      const existing: Incident[] = [{
        id: 'vac-1',
        representativeId: 'rep-1',
        type: 'VACACIONES',
        startDate: pastDate, // Starts on the 10th
        duration: 10,
        createdAt: '2024-01-01T00:00:00Z'
      }];

      const newIncident: Incident = {
        id: 'tardy-1',
        type: 'TARDANZA',
        representativeId: 'rep-1',
        startDate: today, // Tries to add on the 15th
        duration: 1,
        createdAt: new Date().toISOString(),
      }

      // We need a larger calendar for date resolution
      // We need a larger calendar for date resolution, centered around today/pastDate
      const biggerCalendar = Array.from({ length: 30 }, (_, i) => ({
        date: format(addDays(new Date(pastDate), i), 'yyyy-MM-dd'),
        dayOfWeek: (i + 1) % 7,
        kind: 'WORKING' as 'WORKING',
        isSpecial: false,
      }));

      const result = validateIncident(newIncident, existing, biggerCalendar, mockRep, mockAllReps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('OVERLAP_WITH_FORMAL_INCIDENT');
      }
    });
  })
})
