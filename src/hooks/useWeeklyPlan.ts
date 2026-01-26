'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useCoverageStore } from '@/store/useCoverageStore'
import { buildWeeklySchedule } from '../domain/planning/buildWeeklySchedule'
import { DayInfo } from '../domain/types'

/**
 * Hook "ciego al tiempo" que calcula el plan semanal.
 * Acepta los días de la semana ya calculados y se limita a construir el plan.
 * @param weekDays Los 7 DayInfo objetos que definen la semana.
 * @returns El `weeklyPlan` calculado para esos días.
 */
export function useWeeklyPlan(weekDays: DayInfo[]) {
  const { representatives, incidents, specialSchedules, allCalendarDaysForRelevantMonths } =
    useAppStore(s => ({
      representatives: s.representatives,
      incidents: s.incidents,
      specialSchedules: s.specialSchedules,
      allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
    }))

  // 🔄 NEW: Get active coverages from store
  const { getActiveCoverages } = useCoverageStore()
  const coverages = getActiveCoverages()

  const weeklyPlan = useMemo(() => {
    // Si no hay días de la semana o representantes, el plan está vacío.
    if (!representatives.length || !weekDays || weekDays.length !== 7) {
      return null
    }

    // Calcular el plan semanal usando los días ya derivados.
    const derivedWeeklyPlan = buildWeeklySchedule(
      representatives,
      incidents,
      specialSchedules,
      weekDays,
      allCalendarDaysForRelevantMonths,
      coverages // 👈 Pass coverages to domain
    )

    return derivedWeeklyPlan
  }, [
    weekDays, // La dependencia directa que fuerza la re-evaluación.
    representatives,
    incidents,
    specialSchedules,
    allCalendarDaysForRelevantMonths,
    coverages, // 👈 Add coverages as dependency
  ])

  return { weeklyPlan }
}
