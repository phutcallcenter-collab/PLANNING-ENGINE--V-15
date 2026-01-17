import { computeDailyCoverage } from '../../../src/domain/planning/computeDailyCoverage'
import { Representative } from '../../../src/domain/representatives/types'
import { AssignmentContext } from '../../../src/domain/planning/shiftAssignment'

describe('computeDailyCoverage', () => {
  const reps: Representative[] = [
    { id: 'r1', name: 'Día', baseShift: 'DAY', baseSchedule: {} },
    {
      id: 'r2',
      name: 'Mixto Semana',
      baseShift: 'DAY',
      mixProfile: { type: 'WEEKDAY' },
      baseSchedule: {},
    },
    { id: 'r3', name: 'Noche', baseShift: 'NIGHT', baseSchedule: {} },
  ]

  const contexts: Record<string, AssignmentContext> = {
    r1: {
      date: '2025-02-03', // lunes
      availability: 'AVAILABLE',
    },
    r2: {
      date: '2025-02-03',
      availability: 'AVAILABLE',
    },
    r3: {
      date: '2025-02-03',
      availability: 'AVAILABLE',
    },
  }

  it('counts coverage correctly with mix profiles', () => {
    const result = computeDailyCoverage({
      date: '2025-02-03',
      representatives: reps,
      contexts,
    })

    expect(result.shifts.DAY).toBe(2) // r1 + r2
    expect(result.shifts.NIGHT).toBe(2) // r2 + r3
  })

  it('removes unavailable reps from coverage', () => {
    const unavailableContexts = {
      ...contexts,
      r2: {
        ...contexts.r2,
        availability: 'UNAVAILABLE',
      },
    }

    const result = computeDailyCoverage({
      date: '2025-02-03',
      representatives: reps,
      contexts: unavailableContexts,
    })

    expect(result.shifts.DAY).toBe(1)
    expect(result.shifts.NIGHT).toBe(1)
  })
})
