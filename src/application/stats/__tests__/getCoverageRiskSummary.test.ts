import { getCoverageRiskSummary } from '../getCoverageRiskSummary'
import type {
  CoverageRiskInput,
} from '../getCoverageRiskSummary'
import {
  WeeklyPlan,
  CoverageRule,
  DayInfo,
  SwapEvent,
  Incident,
} from '@/domain/types'

const mockWeekDays: DayInfo[] = Array.from({ length: 7 }, (_, i) => ({
  date: `2025-01-${(i + 1).toString().padStart(2, '0')}`,
  dayOfWeek: (i + 1) % 7,
  kind: 'WORKING',
  isSpecial: false,
}))

const mockWeeklyPlan: WeeklyPlan = {
  weekStart: '2025-01-01',
  agents: [
    {
      representativeId: 'r1',
      days: {
        '2025-01-01': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } }, // 1 DAY
        '2025-01-02': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'DAY' } }, // 1 DAY
        '2025-01-03': { status: 'WORKING', source: 'BASE', assignment: { type: 'SINGLE', shift: 'NIGHT' } },// 1 NIGHT
      },
    },
  ],
}

describe('getCoverageRiskSummary', () => {
  let baseInput: CoverageRiskInput

  beforeEach(() => {
    baseInput = {
      monthDays: mockWeekDays,
      weeklyPlans: [mockWeeklyPlan],
      swaps: [],
      coverageRules: [],
      incidents: [],
      representatives: [],
    }
  })

  it('returns all zeros for empty data or no plans', () => {
    const result = getCoverageRiskSummary({ ...baseInput, weeklyPlans: [] })
    expect(result).toEqual({
      totalDays: 7,
      daysWithDeficit: 0,
      criticalDeficitDays: 0,
      totalDeficit: 0,
      worstShift: { shift: null, deficit: 0 },
      dailyDeficits: [],
    })
  })

  it('calculates daysWithDeficit correctly (1 deficit counts day once)', () => {
    const rules: CoverageRule[] = [
      { id: 'r1', scope: { type: 'GLOBAL' }, required: 1 },
    ]
    // Day 1-3: Deficits as analyzed (3 days)
    // Day 4-7: Full deficit (4 days)
    // Total: 7 days with deficit.
    // The Strict Risk Eval Rule evaluates all days in the plan range.
    const result = getCoverageRiskSummary({ ...baseInput, coverageRules: rules })
    expect(result.daysWithDeficit).toBe(7)
  })

  it('calculates criticalDeficitDays for deficits > 2', () => {
    const rules: CoverageRule[] = [
      { id: 'r-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 2 }, // deficit 1 on day 1&2
      { id: 'r-night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 2 }, // deficit 2 on day 1&2
    ]
    // Day 1: DAY deficit 1, NIGHT deficit 2. Total 3 -> CRITICAL
    // Day 2: DAY deficit 1, NIGHT deficit 2. Total 3 -> CRITICAL
    // Day 3: DAY deficit 2, NIGHT deficit 1. Total 3 -> CRITICAL
    // Day 4-7: DAY deficit 2, NIGHT deficit 2. Total 4 -> CRITICAL (x4)
    // Total Critical: 3 + 4 = 7
    const result = getCoverageRiskSummary({ ...baseInput, coverageRules: rules })
    expect(result.criticalDeficitDays).toBe(7)
  })

  it('calculates totalDeficit as sum of all shift deficits', () => {
    const rules: CoverageRule[] = [
      { id: 'r-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 2 }, // deficit 1 on day 1&2
      { id: 'r-night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 1 }, // deficit 1 on day 1&2
    ]
    // Day 1: deficit 1 (day) + 1 (night) = 2
    // Day 2: deficit 1 (day) + 1 (night) = 2
    // Day 3: deficit 2 (day) + 0 (night) = 2
    // Day 4-7: deficit 2 (day) + 1 (night) = 3 * 4 = 12
    // Total: 6 + 12 = 18
    const result = getCoverageRiskSummary({ ...baseInput, coverageRules: rules })
    expect(result.totalDeficit).toBe(18)
  });

  it('identifies the worst shift correctly', () => {
    const rules: CoverageRule[] = [
      { id: 'r-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 5 }, // High deficit
      { id: 'r-night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 1 }, // Low deficit
    ]
    const result = getCoverageRiskSummary({ ...baseInput, coverageRules: rules });
    expect(result.worstShift.shift).toBe('DAY');
    expect(result.worstShift.deficit).toBeGreaterThan(0);
  })

  it('populates dailyDeficits with detailed deficit information', () => {
    const rules: CoverageRule[] = [
      { id: 'r-global', scope: { type: 'GLOBAL' }, required: 1 },
    ];
    // All 7 days have deficit.
    const result = getCoverageRiskSummary({ ...baseInput, coverageRules: rules });
    expect(result.dailyDeficits.length).toBe(7);
    expect(result.dailyDeficits).toContainEqual({
      date: '2025-01-01',
      shift: 'NIGHT',
      deficit: 1,
      actual: 0,
      required: 1,
    });
    expect(result.dailyDeficits).toContainEqual({
      date: '2025-01-03',
      shift: 'DAY',
      deficit: 1,
      actual: 0,
      required: 1,
    });
  });

  it('[CRITICAL] aggregates deficits across multiple weekly plans and only evaluates days with plans', () => {
    const monthDays: DayInfo[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2025-01-${(i + 1).toString().padStart(2, '0')}`,
      dayOfWeek: (i + 1) % 7,
      kind: 'WORKING',
      isSpecial: false,
    }))

    const week1Plan: WeeklyPlan = {
      weekStart: '2025-01-01',
      agents: [
        {
          representativeId: 'r1',
          days: {
            '2025-01-01': {
              status: 'WORKING',
              source: 'BASE',
              assignment: { type: 'SINGLE', shift: 'DAY' },
            }, // 1 DAY
            // This plan covers up to 2025-01-07, but with no other assignments.
          },
        },
      ],
    }

    const week2Plan: WeeklyPlan = {
      weekStart: '2025-01-08',
      agents: [
        {
          representativeId: 'r2',
          days: {
            '2025-01-08': {
              status: 'WORKING',
              source: 'BASE',
              assignment: { type: 'SINGLE', shift: 'NIGHT' },
            }, // 1 NIGHT
            // This plan covers from 2025-01-08 to 2025-01-14
          },
        },
      ],
    }

    const rules: CoverageRule[] = [
      { id: 'r-day', scope: { type: 'SHIFT', shift: 'DAY' }, required: 1 },
      { id: 'r-night', scope: { type: 'SHIFT', shift: 'NIGHT' }, required: 1 },
    ]

    const result = getCoverageRiskSummary({
      ...baseInput,
      monthDays,
      weeklyPlans: [week1Plan, week2Plan],
      coverageRules: rules,
    })

    // The implementation only evaluates days covered by a plan.
    // In this test, plans cover all 14 days of the month.
    // On 2025-01-01: DAY is covered (1), NIGHT has a deficit of 1.
    const deficitWk1Day1 = 1

    // For the other 6 days of week 1, no agents are assigned.
    // Deficit is 1 for DAY + 1 for NIGHT = 2 per day.
    const otherDaysWk1 = 6
    const otherDeficitsWk1 = otherDaysWk1 * 2 // Both shifts have deficit

    // On 2025-01-08: NIGHT is covered (1), DAY has a deficit of 1.
    const deficitWk2Day1 = 1

    // For the other 6 days of week 2, no agents are assigned.
    const otherDaysWk2 = 6
    const otherDeficitsWk2 = otherDaysWk2 * 2 // Both shifts have deficit

    // Total days with deficit is 14 because every evaluated day has at least one deficit.
    expect(result.daysWithDeficit).toBe(14)

    const expectedTotalDeficit =
      deficitWk1Day1 + otherDeficitsWk1 + deficitWk2Day1 + otherDeficitsWk2
    expect(result.totalDeficit).toBe(expectedTotalDeficit) // 1 + 12 + 1 + 12 = 26
    expect(result.dailyDeficits.length).toBe(1 + 6 * 2 + 1 + 6 * 2) // 1 + 12 + 1 + 12 = 26 deficit events
  })
})
