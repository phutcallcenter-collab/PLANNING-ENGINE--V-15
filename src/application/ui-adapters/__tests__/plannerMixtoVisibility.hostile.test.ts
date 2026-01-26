import { describe, it, expect } from 'vitest'
import { belongsToShiftThisWeek } from '@/ui/planning/belongsToShiftThisWeek'
import {
    Representative,
    SpecialSchedule,
    WeeklyPresence,
    DayInfo,
    DailyScheduleState,
} from '@/domain/types'

/**
 * 🧨 HOSTILE TEST
 *
 * Regla absoluta:
 * - El planner NO usa baseShift para decidir visibilidad.
 * - El planner DEBE usar el estado efectivo diario.
 * - MIXTO SIEMPRE aparece en DAY y NIGHT.
 * - Aunque WeeklyPresence.days esté vacío.
 */

const weekDays: DayInfo[] = [
    { date: '2026-01-03' } as any, // Saturday
    { date: '2026-01-04' } as any, // Sunday
]

const nightRep: Representative = {
    id: 'rep-night-mixto',
    name: 'Mixto Nocturno',
    baseShift: 'NIGHT',
    baseSchedule: {
        0: 'OFF',
        1: 'WORKING',
        2: 'WORKING',
        3: 'WORKING',
        4: 'WORKING',
        5: 'WORKING',
        6: 'OFF',
    },
    mixProfile: { type: 'WEEKEND' },
    isActive: true,
    role: 'SALES',
    orderIndex: 0,
}

const emptyWeeklyPresence: WeeklyPresence = {
    representativeId: nightRep.id,
    days: {}, // 👈 deliberadamente vacío
}

const makePattern = (value: DailyScheduleState) => {
    const p: any = {}
    for (let i = 0; i <= 6; i++) p[i] = value
    return p
}

const mixtoWeekendSchedule: SpecialSchedule = {
    id: 'mixto-weekend',
    scope: 'INDIVIDUAL',
    targetId: nightRep.id,
    from: '2026-01-01',
    to: '2026-01-31',
    weeklyPattern: makePattern('MIXTO'),
}

describe('🧨 HOSTILE: Planner MIXTO Visibility', () => {
    it('MIXTO appears in DAY planner even if baseShift is NIGHT', () => {
        const visible = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'DAY',
            nightRep,
            [mixtoWeekendSchedule]
        )

        expect(visible).toBe(true)
    })

    it('MIXTO appears in NIGHT planner even if baseShift is NIGHT', () => {
        const visible = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'NIGHT',
            nightRep,
            [mixtoWeekendSchedule]
        )

        expect(visible).toBe(true)
    })

    it('OFF does NOT appear in any planner', () => {
        const offSchedule: SpecialSchedule = {
            ...mixtoWeekendSchedule,
            weeklyPattern: makePattern('OFF'),
        }

        const visibleDay = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'DAY',
            nightRep,
            [offSchedule]
        )

        const visibleNight = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'NIGHT',
            nightRep,
            [offSchedule]
        )

        expect(visibleDay).toBe(false)
        expect(visibleNight).toBe(false)
    })

    it('BASE DAY only appears in DAY planner', () => {
        const baseDaySchedule: SpecialSchedule = {
            ...mixtoWeekendSchedule,
            weeklyPattern: makePattern('DAY'),
        }

        const visibleDay = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'DAY',
            nightRep,
            [baseDaySchedule]
        )

        const visibleNight = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'NIGHT',
            nightRep,
            [baseDaySchedule]
        )

        expect(visibleDay).toBe(true)
        expect(visibleNight).toBe(false)
    })

    it('❌ FAILS if planner uses baseShift instead of effective state', () => {
        // Este test verifica que si no hay reglas, SÍ se usa el baseShift.
        // O mejor dicho: que el Adapter resuelve BASE y luego belongsToShiftThisWeek checkea BASE shift.

        const visible = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            weekDays,
            'DAY',
            nightRep,
            [] // sin reglas especiales
        )

        // Base NIGHT → DAY debería ser falso
        expect(visible).toBe(false)
    })

    it('NATIVE MIX PROFILE (Weekend) appears in DAY planner on Saturday', () => {
        // Rep has mixProfile: WEEKEND (see mock definition above)
        // Date: 2026-01-03 is Saturday

        const visible = belongsToShiftThisWeek(
            emptyWeeklyPresence,
            [weekDays[0]], // Just Saturday
            'DAY',
            nightRep,
            [] // No Special Schedule!
        )

        expect(visible).toBe(true)
    })

    it('SEAL: BASE with mixProfile appears in both planners without becoming MIXTO', () => {
        // 🔒 Este test blinda la separación entre Estado y Visibilidad.
        // El estado efectivo sigue siendo BASE (Noche), pero la UI permite verlo en DÍA.
        const rep: Representative = {
            id: 'rep-seal',
            name: 'Seal Rep',
            baseShift: 'NIGHT',
            baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
            mixProfile: { type: 'WEEKEND' },
            isActive: true,
            role: 'SALES',
            orderIndex: 0
        }

        const visibleDay = belongsToShiftThisWeek(
            { representativeId: rep.id, days: {} },
            [weekDays[0]], // Saturday
            'DAY',
            rep,
            []
        )

        expect(visibleDay).toBe(true)
    })
})
