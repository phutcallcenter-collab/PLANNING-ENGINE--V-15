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
import { DayInfo } from '@/domain/calendar/types'
import { Representative } from '@/domain/types'
import { ResolvedCellState, CellBadge } from './cellState'
import * as humanize from '@/application/presenters/humanize'

/**
 * Maps an EffectiveDutyResult to a fully resolved cell state.
 * 
 * @param badge - Optional badge from DayResolution.computed.display.badge
 * @param coverageInfo - Optional coverage context for tooltip generation
 */
export function mapEffectiveDutyToCellState(
    duty: EffectiveDutyResult,
    day: DayInfo,
    rep: Representative,
    allReps: Representative[],
    badge?: CellBadge, // 🔄 Badge from domain
    coverageInfo?: { // 🔄 NEW: Coverage context for tooltips
        coveredByName?: string
        coveringName?: string
    }
): ResolvedCellState {
    // 🔴 AUSENCIA — prioridad absoluta
    if (duty.reason === 'AUSENCIA') {
        let tooltip = humanize.absentTooltip(rep, day.date)

        if (duty.details === 'JUSTIFICADA') {
            tooltip = `${rep.name} estuvo ausente (Justificada)`
        }

        if (duty.note) tooltip += `\n📝 ${duty.note}`

        return {
            variant: duty.details === 'JUSTIFICADA' ? 'ABSENT_JUSTIFIED' : 'ABSENT',
            label: duty.details === 'JUSTIFICADA' ? '✓ AUS' : 'AUS',
            tooltip,
            ariaLabel: `${rep.name} estuvo ausente el ${day.date}`,
            canEdit: false,
            canContextMenu: false,
            badge: badge || 'AUSENCIA', // Badge has priority
        }
    }

    // 🔵 VACACIONES
    if (duty.reason === 'VACACIONES') {
        let tooltip = `${rep.name} está de vacaciones.`
        if (duty.note) tooltip += `\n📝 ${duty.note}`

        return {
            variant: 'VACATION',
            label: 'VAC',
            tooltip,
            ariaLabel: `${rep.name} está de vacaciones`,
            canEdit: false,
            canContextMenu: false,
            badge: badge || 'VACACIONES',
        }
    }

    // 🟣 LICENCIA
    // Fix: Un día OFF gana sobre el label de licencia
    // Robust Fix: Use day.dayOfWeek directly from DayInfo to avoid timezone issues with parseISO
    const isBaseOff = rep.baseSchedule[day.dayOfWeek] === 'OFF'

    if (duty.reason === 'LICENCIA') {
        let tooltip = `${rep.name} está de licencia.`
        if (duty.note) tooltip += `\n📝 ${duty.note}`

        return {
            variant: 'LICENSE',
            label: 'LIC',
            tooltip,
            ariaLabel: `${rep.name} está de licencia`,
            canEdit: false,
            canContextMenu: false,
            badge: badge || 'LICENCIA',
        }
    }

    // ⚪ LIBRE
    if (!duty.shouldWork) {
        let tooltip = humanize.offBaseTooltip(rep)

        if (duty.source === 'OVERRIDE') {
            tooltip = 'Día libre asignado manualmente'
        } else if (duty.source === 'EFFECTIVE_PERIOD') {
            tooltip = 'Día libre por período especial'
        }

        if (duty.note) {
            tooltip += `\n📝 ${duty.note}`
        }

        const isManager = rep.role === 'MANAGER'

        return {
            variant: 'OFF',
            label: isManager ? 'OFF' : 'OFF',
            tooltip,
            ariaLabel: `${rep.name} no trabaja este día`,
            canEdit: true,
            canContextMenu: true,
            badge, // 🔄 Pass through badge (CUBIERTO/CUBRIENDO)
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
            badge, // 🔄 Pass through badge
        }
    }

    // 🟢 TRABAJO NORMAL (baseline, con label visible para managers)
    const isManager = rep.role === 'MANAGER'

    let label: string | undefined = undefined
    if (isManager) {
        // Para managers, mostrar el turno visible
        if (rep.baseShift === 'DAY') label = 'Día'
        else if (rep.baseShift === 'NIGHT') label = 'Noche'
        // INTER se maneja con effective periods o overrides
    }

    // 🔄 NEW: Build tooltip with coverage context
    let tooltip = humanize.workingBaseTooltip(rep, day.date)

    if (badge === 'CUBIERTO' && coverageInfo?.coveredByName) {
        tooltip = `${rep.name} está siendo cubierto por ${coverageInfo.coveredByName}`
    } else if (badge === 'CUBRIENDO' && coverageInfo?.coveringName) {
        tooltip = `${rep.name} está cubriendo a ${coverageInfo.coveringName}`
    }

    return {
        variant: 'WORKING',
        label,
        tooltip,
        ariaLabel: `${rep.name} trabaja normalmente`,
        canEdit: true,
        canContextMenu: true,
        badge, // 🔄 Pass through badge (CUBIERTO/CUBRIENDO)
    }
}
