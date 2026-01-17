/**
 * @file Maps domain-level EffectiveDutyResult to UI-ready ResolvedCellState.
 * @purpose Single source of truth for cell state resolution.
 * 
 * CRITICAL INVARIANTS (DO NOT BREAK):
 * ❌ Never use day.isSpecial to determine OFF
 * ❌ Never assume holiday = day off
 * ❌ Never create vacation logic in UI
 * ✅ shouldWork is the source of truth
 * ✅ role describes HOW they work
 * ✅ reason explains WHY they don't work
 * ✅ Planner does NOT compensate holidays
 * 
 * VISUAL CONTRACT:
 * - ABSENT: always red, always visible
 * - VACATION/LICENSE: always their color
 * - OFF: gray, quiet
 * - WORKING: green, silent (no label)
 * - HOLIDAY: green with label
 */

import { EffectiveDutyResult } from '@/domain/swaps/resolveEffectiveDuty'
import { DayInfo, DailyPresence } from '@/domain/calendar/types'
import { Representative } from '@/domain/types'
import { ResolvedCellState } from './cellState'
import * as humanize from '@/application/presenters/humanize'

/**
 * Maps an EffectiveDutyResult to a fully resolved cell state.
 */
export function mapEffectiveDutyToCellState(
    duty: EffectiveDutyResult,
    day: DayInfo,
    rep: Representative,
    allReps: Representative[],
    source?: DailyPresence['source'],
    overrideNote?: string
): ResolvedCellState {
    // 🔴 AUSENCIA — prioridad absoluta
    if (duty.reason === 'AUSENCIA') {
        return {
            variant: 'ABSENT',
            label: 'AUS',
            tooltip: humanize.absentTooltip(rep, day.date),
            ariaLabel: `${rep.name} estuvo ausente el ${day.date}`,
            canEdit: false,
            canContextMenu: false,
        }
    }

    // 🔵 VACACIONES
    if (duty.reason === 'VACACIONES') {
        return {
            variant: 'VACATION',
            label: 'VAC',
            tooltip: `${rep.name} está de vacaciones.`,
            ariaLabel: `${rep.name} está de vacaciones`,
            canEdit: false,
            canContextMenu: false,
        }
    }

    // 🟣 LICENCIA
    if (duty.reason === 'LICENCIA' || duty.reason === 'AUSENCIA_JUSTIFICADA') {
        const isLicense = duty.reason === 'LICENCIA'
        return {
            variant: 'LICENSE',
            label: isLicense ? 'LIC' : 'JUS',
            tooltip: `${rep.name} está de ${isLicense ? 'licencia' : 'ausencia justificada'}.`,
            ariaLabel: `${rep.name} está de ${isLicense ? 'licencia' : 'ausencia justificada'}`,
            canEdit: false,
            canContextMenu: false,
        }
    }

    // ⚪ LIBRE
    if (!duty.shouldWork) {
        let tooltipText = humanize.offBaseTooltip(rep) // Default

        if (source === 'OVERRIDE') {
            tooltipText = overrideNote
                ? `Día libre manual: ${overrideNote}`
                : 'Día libre asignado manualmente.'
        } else if (source === 'INCIDENT') {
            // This case might not be hit if duty.reason covers it, but as a fallback.
            tooltipText = `No trabaja debido a una incidencia.`
        }

        return {
            variant: 'OFF',
            label: 'OFF',
            tooltip: tooltipText,
            ariaLabel: `${rep.name} no trabaja este día`,
            canEdit: true,
            canContextMenu: true,
        }
    }

    // 🟢 FERIADO TRABAJADO
    if (day.isSpecial) {
        return {
            variant: 'HOLIDAY',
            label: 'FER',
            tooltip: humanize.workingHolidayTooltip(rep, day.label),
            ariaLabel: `${rep.name} trabaja en feriado: ${day.label || 'feriado'}`,
            canEdit: true,
            canContextMenu: true,
        }
    }

    // 🟢 TRABAJO NORMAL (baseline, sin label)
    return {
        variant: 'WORKING',
        tooltip: humanize.workingBaseTooltip(rep, day.date),
        ariaLabel: `${rep.name} trabaja normalmente`,
        canEdit: true,
        canContextMenu: true,
    }
}
