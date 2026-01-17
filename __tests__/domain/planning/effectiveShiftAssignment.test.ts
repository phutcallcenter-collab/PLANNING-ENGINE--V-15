import { getEffectiveShiftAssignment } from '../../../src/domain/planning/effectiveShiftAssignment'
import { Representative } from '../../../src/domain/representatives/types'
import { AssignmentContext } from '../../../src/domain/planning/shiftAssignment'

describe('getEffectiveShiftAssignment', () => {
  const repDay: Representative = {
    id: 'rep-day',
    name: 'Rep Día',
    baseShift: 'DAY',
    baseSchedule: {},
  }

  const repMixedWeekday: Representative = {
    id: 'rep-mix',
    name: 'Rep Mixto Semana',
    baseShift: 'DAY',
    mixProfile: { type: 'WEEKDAY' },
    baseSchedule: {},
  }

  it('returns NONE if unavailable regardless of overrides or mix', () => {
    const ctx: AssignmentContext = {
      date: '2025-02-03',
      availability: 'UNAVAILABLE',
      overrides: {
        force: { type: 'BOTH' },
      },
    }

    expect(getEffectiveShiftAssignment(repMixedWeekday, ctx)).toEqual({
      type: 'NONE',
    })
  })

  it('respects explicit override SINGLE', () => {
    const ctx: AssignmentContext = {
      date: '2025-02-03',
      availability: 'AVAILABLE',
      overrides: {
        force: { type: 'SINGLE', shift: 'NIGHT' },
      },
    }

    expect(getEffectiveShiftAssignment(repDay, ctx)).toEqual({
      type: 'SINGLE',
      shift: 'NIGHT',
    })
  })

  it('respects explicit override BOTH', () => {
    const ctx: AssignmentContext = {
      date: '2025-02-03',
      availability: 'AVAILABLE',
      overrides: {
        force: { type: 'BOTH' },
      },
    }

    expect(getEffectiveShiftAssignment(repDay, ctx)).toEqual({
      type: 'BOTH',
    })
  })

  it('falls back to mix profile when no override', () => {
    const ctx: AssignmentContext = {
      date: '2025-02-03', // Lunes
      availability: 'AVAILABLE',
    }

    expect(getEffectiveShiftAssignment(repMixedWeekday, ctx)).toEqual({
      type: 'BOTH',
    })
  })

  it('returns base shift when no mix and no override', () => {
    const ctx: AssignmentContext = {
      date: '2025-02-03',
      availability: 'AVAILABLE',
    }

    expect(getEffectiveShiftAssignment(repDay, ctx)).toEqual({
      type: 'SINGLE',
      shift: 'DAY',
    })
  })
})
