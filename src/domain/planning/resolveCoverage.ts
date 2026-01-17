import type { CoverageRule, ISODate, ShiftType } from '../types'

/**
 * Define el resultado de la resolución de cobertura, indicando el valor
 * requerido, la fuente de la decisión (una regla o el valor por defecto) y
 * el ID de la regla que aplicó, junto con una razón legible.
 */
export interface ResolvedCoverage {
  required: number
  source: 'RULE' | 'DEFAULT'
  ruleId?: string
  reason: string
}

/**
 * Resuelve la cobertura mínima requerida para una fecha y turno específicos,
 * aplicando una jerarquía de reglas de la más específica a la más general.
 *
 * @param date La fecha en formato ISO (YYYY-MM-DD).
 * @param shift El turno ('DAY' o 'NIGHT').
 * @param rules El array de todas las reglas de cobertura disponibles.
 * @returns Un objeto ResolvedCoverage con el requisito y la fuente de la decisión.
 */
export function resolveCoverage(
  date: ISODate,
  shift: ShiftType,
  rules: CoverageRule[]
): ResolvedCoverage {
  // Orden de precedencia: DATE > SHIFT > GLOBAL
  // NOTE: .find() assumes at most one active rule per scope/day/shift config.
  // If UI allows duplicates, this logic will pick the first one found.

  // 1. Regla por fecha (DATE)
  const dateMatch = rules.find(
    r => r.scope.type === 'DATE' && r.scope.date === date
  )
  if (dateMatch) {
    return {
      required: dateMatch.required,
      source: 'RULE',
      ruleId: dateMatch.id,
      reason: dateMatch.label || 'Excepción por Fecha',
    }
  }

  // Helper para nombres de días
  const dayName = new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long' })
  const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const shiftLabel = shift === 'DAY' ? 'Día' : 'Noche'
  const dow = new Date(date + 'T12:00:00Z').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

  // 2. Regla por DíaSemana + Turno (WEEKDAY + SHIFT)
  const weekdayShiftMatch = rules.find(
    r =>
      r.scope.type === 'WEEKDAY' &&
      r.scope.day === dow &&
      r.scope.shift === shift
  )
  if (weekdayShiftMatch) {
    return {
      required: weekdayShiftMatch.required,
      source: 'RULE',
      ruleId: weekdayShiftMatch.id,
      reason: weekdayShiftMatch.label || `Demanda: ${dayNameCap} · Turno ${shiftLabel}`,
    }
  }

  // 3. Regla por DíaSemana genérico (WEEKDAY - Any Shift)
  const weekdayMatch = rules.find(
    r =>
      r.scope.type === 'WEEKDAY' &&
      r.scope.day === dow &&
      !r.scope.shift // Explicitly no shift defined
  )
  if (weekdayMatch) {
    return {
      required: weekdayMatch.required,
      source: 'RULE',
      ruleId: weekdayMatch.id,
      reason: weekdayMatch.label || `Demanda: ${dayNameCap} (Global)`,
    }
  }

  // 4. Regla por Turno genérico (SHIFT)
  const shiftMatch = rules.find(
    r => r.scope.type === 'SHIFT' && r.scope.shift === shift
  )
  if (shiftMatch) {
    return {
      required: shiftMatch.required,
      source: 'RULE',
      ruleId: shiftMatch.id,
      reason: shiftMatch.label || `Criterio: Turno ${shiftLabel} (Estándar)`,
    }
  }

  // 5. Fallback a regla global (GLOBAL)
  const globalMatch = rules.find(r => r.scope.type === 'GLOBAL')
  if (globalMatch) {
    return {
      required: globalMatch.required,
      source: 'RULE',
      ruleId: globalMatch.id,
      reason: globalMatch.label || 'Global (Estándar)',
    }
  }

  // 4. Fallback de seguridad si no hay ninguna regla aplicable.
  return {
    required: 0,
    source: 'DEFAULT',
    reason: 'Valor por defecto (ninguna regla aplicable)',
  }
}
