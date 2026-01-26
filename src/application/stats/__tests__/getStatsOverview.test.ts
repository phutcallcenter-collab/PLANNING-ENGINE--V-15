import { getStatsOverview, StatsOverviewInput } from '../getStatsOverview'
import {
  Representative,
  Incident,
  WeeklyPlan,
  SwapEvent,
  CoverageRule,
  DayInfo,
} from '@/domain/types'

// Mock Data
const mockReps: Representative[] = [
  { id: 'r1', name: 'Ana', baseShift: 'DAY', role: 'SALES', isActive: true, orderIndex: 0, baseSchedule: { 1: 'WORKING' } },
  { id: 'r2', name: 'Bob', baseShift: 'NIGHT', role: 'SALES', isActive: true, orderIndex: 1, baseSchedule: { 1: 'WORKING' } },
]

const mockMonthDays: DayInfo[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2025-01-${(i + 1).toString().padStart(2, '0')}`,
  dayOfWeek: (i % 7) + 1,
  kind: 'WORKING',
  isSpecial: false,
}))

const mockWeeklyPlan: WeeklyPlan = {
  weekStart: '2025-01-01',
  agents: [
    {
      representativeId: 'r1',
      days: { '2025-01-01': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } } },
    },
    {
      representativeId: 'r2',
      days: { '2025-01-01': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'NIGHT' } } },
    },
    {
      representativeId: 'r1',
      days: { '2025-01-02': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } } },
    },
    {
      representativeId: 'r2',
      days: { '2025-01-02': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'NIGHT' } } },
    },
  ],
}

describe('getStatsOverview', () => {
  let baseInput: StatsOverviewInput

  beforeEach(() => {
    baseInput = {
      month: '2025-01',
      incidents: [],
      representatives: mockReps,
      swaps: [],
      weeklyPlans: [mockWeeklyPlan],
      monthDays: mockMonthDays,
      coverageRules: [],
      specialSchedules: []
    }
  })

  it('should return all zeros for empty data', () => {
    const input = { ...baseInput, incidents: [], swaps: [], representatives: [] }
    const result = getStatsOverview(input)
    expect(result).toEqual({
      totalIncidents: 0,
      peopleAtRisk: 0,
      deficitDays: 0,
      totalSwaps: 0,
      licenseEvents: 0,
      vacationsEvents: 0,
    })
  })

  it('should count total incidents, excluding OVERRIDE', () => {
    const incidents: Incident[] = [
      { id: 'i1', representativeId: 'r1', type: 'TARDANZA', startDate: '2025-01-05', duration: 1, createdAt: '' },
      { id: 'i2', representativeId: 'r2', type: 'AUSENCIA', startDate: '2025-01-10', duration: 1, createdAt: '' },
      { id: 'i3', representativeId: 'r1', type: 'OVERRIDE', startDate: '2025-01-12', duration: 1, createdAt: '' },
    ]
    const result = getStatsOverview({ ...baseInput, incidents })
    expect(result.totalIncidents).toBe(2)
  })

  it('should count people at risk based on danger level', () => {
    const incidents: Incident[] = [
      // Bob gets 11 points
      { id: 'i1', representativeId: 'r2', type: 'TARDANZA', startDate: '2025-01-04', duration: 1, createdAt: '' }, // Sab, 3 pts
      { id: 'i2', representativeId: 'r2', type: 'TARDANZA', startDate: '2025-01-05', duration: 1, createdAt: '' }, // Dom, 3 pts
      { id: 'i3', representativeId: 'r2', type: 'AUSENCIA', startDate: '2025-01-06', duration: 1, createdAt: '' }, // Lun, 3 pts
      { id: 'i4', representativeId: 'r2', type: 'ERROR', startDate: '2025-01-07', duration: 1, createdAt: '' }, // 2 pts -> Total 11
    ]
    const result = getStatsOverview({ ...baseInput, incidents })
    expect(result.peopleAtRisk).toBe(1)
  })

  it('should count total swaps within the month', () => {
    const swaps: SwapEvent[] = [
      { id: 's1', type: 'COVER', date: '2025-01-15', shift: 'DAY', fromRepresentativeId: 'r1', toRepresentativeId: 'r2', createdAt: '' },
      { id: 's2', type: 'DOUBLE', date: '2025-01-20', shift: 'NIGHT', representativeId: 'r1', createdAt: '' },
      { id: 's3', type: 'SWAP', date: '2025-02-01', fromRepresentativeId: 'r1', fromShift: 'DAY', toRepresentativeId: 'r2', toShift: 'NIGHT', createdAt: '' }, // wrong month
    ]
    const result = getStatsOverview({ ...baseInput, swaps })
    expect(result.totalSwaps).toBe(2)
  })

  it('should count days with deficit in any shift only once', () => {
    const rules: CoverageRule[] = [
      { id: 'r-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 2 },
      { id: 'r-night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 2 },
    ]

    // On 2025-01-01, DAY has 1 rep (needs 2, DEFICIT), NIGHT has 1 (needs 2, DEFICIT)
    // On 2025-01-02, DAY has 1 rep (needs 2, DEFICIT), NIGHT has 1 (needs 2, DEFICIT)
    const weeklyPlanWithAssignments: WeeklyPlan = {
      weekStart: '2025-01-01',
      agents: [
        {
          representativeId: 'r1', days: {
            '2025-01-01': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } },
            '2025-01-02': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } }
          }
        },
        {
          representativeId: 'r2', days: {
            '2025-01-01': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'NIGHT' } },
            '2025-01-02': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'NIGHT' } }
          }
        }
      ]
    }

    const result = getStatsOverview({ ...baseInput, coverageRules: rules, weeklyPlans: [weeklyPlanWithAssignments] });

    // Expect 7 deficit days (01-01 to 01-07) because the plan covers the week 
    // and empty days count as 0 coverage vs required 2.
    expect(result.deficitDays).toBe(7);
  })
})
