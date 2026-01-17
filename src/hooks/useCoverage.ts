'use client'

/**
 * @deprecated DO NOT USE - replaced by getEffectiveDailyCoverage (Phase 3.6)
 */
import { useMemo } from 'react'
import {
  ISODate,
  Representative,
  WeeklyPlan,
  DayInfo,
  Incident,
  SwapEvent,
} from '../domain/types'
import { getAvailabilityStatus } from '../domain/availability/getAvailabilityStatus'
import { useAppStore } from '@/store/useAppStore'
import {
  computeDailyCoverage,
  DailyShiftCoverage,
} from '@/domain/planning/computeDailyCoverage'
import { AssignmentContext } from '@/domain/planning/shiftAssignment'
import { computeCoverageDeficit } from '@/domain/planning/computeCoverageDeficit'
import { DailyCoverageDeficit } from '@/domain/planning/coverageDeficit'
import { applySwapsToCoverage } from '@/domain/planning/applySwapsToCoverage'

type UseCoverageResult = {
  dailyDeficits: Record<ISODate, DailyCoverageDeficit>
}

/**
 * Given a weekly plan, computes the availability of a specific representative for a given day.
 * This is a crucial link between the static plan and the dynamic state (incidents).
 * @returns 'AVAILABLE' or 'UNAVAILABLE'
 */
function getDayAvailability(
  rep: Representative,
  date: ISODate,
  incidents: Incident[],
  weeklyPlan: WeeklyPlan,
  allCalendarDays: DayInfo[]
): 'AVAILABLE' | 'UNAVAILABLE' {
  // We use getAvailabilityStatus which already encapsulates the business logic
  // for whether a person is truly available (e.g., not on vacation, license, or marked as absent).
  const status = getAvailabilityStatus(
    rep,
    date,
    incidents,
    weeklyPlan,
    allCalendarDays
  )

  // 'ACTIVE' is the only status that means available for coverage.
  // All others (OFF, VACATION, LICENSE) mean the person is not active.
  return status === 'ACTIVE' ? 'AVAILABLE' : 'UNAVAILABLE'
}

export function useCoverage(
  weeklyPlan: WeeklyPlan | null,
  weekDays: DayInfo[]
): UseCoverageResult {
  const {
    representatives,
    incidents,
    swaps,
    coverageRules,
    allCalendarDaysForRelevantMonths,
  } = useAppStore(s => ({
    representatives: s.representatives,
    incidents: s.incidents,
    swaps: s.swaps,
    coverageRules: s.coverageRules,
    allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
  }))

  const dailyDeficits = useMemo(() => {
    const deficits: Record<ISODate, DailyCoverageDeficit> = {}

    // Early exit if the plan is not ready
    if (!weeklyPlan || !weeklyPlan.agents || weekDays.length === 0) {
      return {}
    }

    const swapsByDate = new Map<ISODate, SwapEvent[]>()
    swaps.forEach(swap => {
      if (!swapsByDate.has(swap.date)) {
        swapsByDate.set(swap.date, [])
      }
      swapsByDate.get(swap.date)!.push(swap)
    })

    const repMap = new Map(representatives.map(r => [r.id, r]))
    // VIOLATION FIX: The coverage calculation MUST use all agents from the plan,
    // not a pre-filtered list. This is the canonical source of truth for who exists.
    const allAgentsInPlan = weeklyPlan.agents
      .map(a => repMap.get(a.representativeId))
      .filter((r): r is Representative => !!r)

    for (const day of weekDays) {
      const date = day.date
      const contexts: Record<string, AssignmentContext> = {}
      const overridesByRepId = new Map<string, any>()
      incidents
        .filter(i => i.type === 'OVERRIDE' && i.startDate === date)
        .forEach(i => {
          overridesByRepId.set(i.representativeId, { force: i.assignment })
        })

      for (const rep of allAgentsInPlan) {
        contexts[rep.id] = {
          date,
          availability: getDayAvailability(
            rep,
            date,
            incidents,
            weeklyPlan,
            allCalendarDaysForRelevantMonths
          ),
          overrides: overridesByRepId.get(rep.id),
        }
      }

      // 1. Calculate base coverage from the weekly plan's context, using ALL agents.
      const baseDailyCoverage: DailyShiftCoverage = computeDailyCoverage({
        date,
        representatives: allAgentsInPlan, // Use all agents in the plan
        contexts,
      })

      // 2. Apply swaps as an operational overlay to get final coverage.
      const swapsForDate = swapsByDate.get(date) || []
      const finalDailyCoverage = applySwapsToCoverage(
        baseDailyCoverage,
        swapsForDate
      )

      // 3. Diagnose deficit based on the final, swap-adjusted coverage.
      deficits[date] = computeCoverageDeficit(finalDailyCoverage, coverageRules)
    }

    return deficits
  }, [
    weekDays,
    representatives,
    incidents,
    swaps,
    weeklyPlan,
    coverageRules,
    allCalendarDaysForRelevantMonths,
  ])

  return { dailyDeficits }
}
