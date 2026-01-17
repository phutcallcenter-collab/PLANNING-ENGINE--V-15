import { getShiftCapabilities } from '../../../src/domain/planning/shiftCapability'
import type { Representative } from '../../../src/domain/types'

describe('Domain Logic: getShiftCapabilities', () => {
  const createRep = (
    id: string,
    baseShift: 'DAY' | 'NIGHT',
    baseSchedule: Record<number, 'WORKING' | 'OFF'>,
    mixProfile?: { type: 'WEEKDAY' | 'WEEKEND' }
  ): Representative => ({
    id,
    name: `Rep ${id}`,
    baseShift,
    baseSchedule,
    mixProfile,
  })

  // --- Dates ---
  const monday = '2024-09-02' // day 1
  const thursday = '2024-09-05' // day 4
  const friday = '2024-09-06' // day 5
  const sunday = '2024-09-08' // day 0

  const allWorking: Record<number, 'WORKING' | 'OFF'> = {
    0: 'WORKING',
    1: 'WORKING',
    2: 'WORKING',
    3: 'WORKING',
    4: 'WORKING',
    5: 'WORKING',
    6: 'WORKING',
  }

  // --- Tests ---

  it('returns empty array if base schedule is OFF for that day', () => {
    const rep = createRep('rep-off', 'DAY', { 1: 'OFF' })
    expect(getShiftCapabilities(rep, monday)).toEqual([])
  })

  it('[HARDENING] returns empty array for a mixed rep on their base day off', () => {
    // This rep is mixed on weekdays, but has Monday off.
    const rep = createRep('rep-mixed-off', 'DAY', { 1: 'OFF' }, { type: 'WEEKDAY' })
    // On Monday, despite being a weekday for their mix profile, their base schedule OFF takes priority.
    expect(getShiftCapabilities(rep, monday)).toEqual([])
  })

  it('returns only base shift for a normal representative on a working day', () => {
    const rep = createRep('rep-normal', 'NIGHT', allWorking)
    expect(getShiftCapabilities(rep, monday)).toEqual(['NIGHT'])
    expect(getShiftCapabilities(rep, friday)).toEqual(['NIGHT'])
  })

  it('returns [DAY, NIGHT] for a WEEKDAY mixed rep on a weekday', () => {
    const rep = createRep('rep-wd', 'DAY', allWorking, { type: 'WEEKDAY' })
    expect(getShiftCapabilities(rep, monday)).toEqual(['DAY', 'NIGHT'])
    expect(getShiftCapabilities(rep, thursday)).toEqual(['DAY', 'NIGHT'])
  })

  it('returns only base shift for a WEEKDAY mixed rep on a weekend', () => {
    const rep = createRep('rep-wd', 'DAY', allWorking, { type: 'WEEKDAY' })
    expect(getShiftCapabilities(rep, friday)).toEqual(['DAY'])
    expect(getShiftCapabilities(rep, sunday)).toEqual(['DAY'])
  })

  it('returns [DAY, NIGHT] for a WEEKEND mixed rep on a weekend', () => {
    const rep = createRep('rep-we', 'NIGHT', allWorking, { type: 'WEEKEND' })
    expect(getShiftCapabilities(rep, friday)).toEqual(['DAY', 'NIGHT'])
    expect(getShiftCapabilities(rep, sunday)).toEqual(['DAY', 'NIGHT'])
  })

  it('returns only base shift for a WEEKEND mixed rep on a weekday', () => {
    const rep = createRep('rep-we', 'NIGHT', allWorking, { type: 'WEEKEND' })
    expect(getShiftCapabilities(rep, monday)).toEqual(['NIGHT'])
    expect(getShiftCapabilities(rep, thursday)).toEqual(['NIGHT'])
  })

  it('handles invalid dates gracefully by returning an empty array', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const rep = createRep('rep-wd', 'DAY', allWorking, { type: 'WEEKDAY' })
    expect(getShiftCapabilities(rep, 'invalid-date')).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
