'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
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

  const weeklyPlan = useMemo(() => {
    // Si no hay días de la semana o representantes, el plan está vacío.
    if (!representatives.length || !weekDays || weekDays.length !== 7) {
      return null
    }

    // 🔥 FIX: Only build plan for active representatives
    const activeRepresentatives = representatives.filter(
      rep => rep.isActive !== false
    )

    // Calcular el plan semanal usando los días ya derivados.
    const derivedWeeklyPlan = buildWeeklySchedule(
      activeRepresentatives,
      incidents,
      specialSchedules,
      weekDays,
      allCalendarDaysForRelevantMonths
    )

    return derivedWeeklyPlan
  }, [
    weekDays, // La dependencia directa que fuerza la re-evaluación.
    representatives,
    incidents,
    specialSchedules,
    allCalendarDaysForRelevantMonths,
  ])

  return { weeklyPlan }
}
