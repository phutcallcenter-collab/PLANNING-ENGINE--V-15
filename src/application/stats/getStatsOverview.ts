import {
  Incident,
  Representative,
  WeeklyPlan,
  SwapEvent,
  DayInfo,
  CoverageRule,
  SpecialSchedule,
} from '@/domain/types'
import { computeMonthlySummary } from '@/domain/analytics/computeMonthlySummary'
import { getEffectiveDailyCoverage } from '@/application/ui-adapters/getEffectiveDailyCoverage'

export interface StatsOverviewInput {
  month: string // YYYY-MM format
  incidents: Incident[]
  representatives: Representative[]
  swaps: SwapEvent[]
  weeklyPlans: WeeklyPlan[] // Array of all weekly plans for the month
  monthDays: DayInfo[]
  coverageRules: CoverageRule[]
  specialSchedules: SpecialSchedule[]
}

export interface StatsOverviewResult {
  totalIncidents: number
  peopleAtRisk: number
  deficitDays: number
  totalSwaps: number
  licenseEvents: number
  vacationsEvents: number
}

/**
 * Aggregates raw domain data into high-level KPIs for the Stats Overview.
 * This function is pure and performs no mutations. It is the single source
 * of truth for the overview KPIs.
 */
export function getStatsOverview(
  input: StatsOverviewInput
): StatsOverviewResult {
  const {
    month,
    incidents,
    representatives,
    swaps,
    weeklyPlans,
    monthDays,
    coverageRules,
  } = input

  if (!representatives.length) {
    return {
      totalIncidents: 0,
      peopleAtRisk: 0,
      deficitDays: 0,
      totalSwaps: 0,
      licenseEvents: 0,
      vacationsEvents: 0
    }
  }

  // 1. Total Incidents & People at Risk (Leverage existing monthly summary logic)
  const monthlySummary = computeMonthlySummary(
    incidents.filter(i => i.type !== 'OVERRIDE'), // Exclude overrides from stats
    month,
    representatives
  )

  const totalIncidents = monthlySummary.totals.totalIncidents
  const peopleAtRisk = monthlySummary.byPerson.filter(
    p => p.riskLevel === 'danger'
  ).length

  // New Metrics: License and Vacation Events (Count events, not days)
  const licenseEvents = incidents.filter(i => i.type === 'LICENCIA' && i.startDate?.startsWith(month)).length
  const vacationsEvents = incidents.filter(i => i.type === 'VACACIONES' && i.startDate?.startsWith(month)).length

  // 2. Deficit Days
  const deficitDaysSet = new Set<string>()

  // A simple way to associate a day with its weekly plan
  const findPlanForDate = (date: string) => {
    // This is a simplification; a robust implementation would use date ranges.
    // For now, we find the plan whose week contains this date.
    return weeklyPlans.find(
      p =>
        date >= p.weekStart &&
        date <
        new Date(new Date(p.weekStart).getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
    )
  }

  for (const day of monthDays) {
    const plan = findPlanForDate(day.date)
    if (!plan) continue

    const dailyCoverage = getEffectiveDailyCoverage(
      plan,
      swaps,
      coverageRules,
      day.date,
      incidents,
      monthDays,
      representatives,
      input.specialSchedules
    )

    if (
      dailyCoverage.DAY.status === 'DEFICIT' ||
      dailyCoverage.NIGHT.status === 'DEFICIT'
    ) {
      deficitDaysSet.add(day.date)
    }
  }

  // 3. Total Swaps in the month
  const totalSwaps = swaps.filter(s => s.date.startsWith(month)).length

  return {
    totalIncidents,
    peopleAtRisk,
    deficitDays: deficitDaysSet.size,
    totalSwaps,
    licenseEvents,
    vacationsEvents
  }
}
