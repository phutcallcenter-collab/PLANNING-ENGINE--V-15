
import { Representative, SpecialSchedule, ShiftType, ISODate, BaseSchedule } from '@/domain/types'
import { parseISO, getDay, isWithinInterval } from 'date-fns'

export interface EffectiveSchedule {
    type: 'BASE' | 'OVERRIDE' | 'MIXTO' | 'OFF'
    shift?: ShiftType // If OVERRIDE or BASE
    source?: SpecialSchedule
}

interface EffectiveScheduleContext {
    representative: Representative
    dateStr: ISODate
    baseSchedule: BaseSchedule
    specialSchedules: SpecialSchedule[]
}

/**
 * 🔒 CANONICAL CONTRACT LOGIC
 * 
 * Determines if a representative's MIXTO contract is active for a given day.
 * This is NOT planner logic - it's contract interpretation.
 * 
 * @param representative The representative to check
 * @param dayOfWeek Day of week (0 = Sunday, 6 = Saturday)
 * @returns true if the representative should be MIXTO on this day
 */
function isMixtoActiveForDay(
    representative: Representative,
    dayOfWeek: number
): boolean {
    if (!representative.mixProfile) return false

    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4 // Mon–Thu
    const isWeekend = dayOfWeek === 0 || dayOfWeek >= 5 // Fri–Sun

    return (
        (representative.mixProfile.type === 'WEEKDAY' && isWeekday) ||
        (representative.mixProfile.type === 'WEEKEND' && isWeekend)
    )
}

/**
 * 🟢 CANONICAL ADAPTER: Explicit Weekly Pattern Resolution
 * 
 * Rules:
 * 1. Find the Highest Priority Schedule (Individual > Global).
 * 2. Look up the definitive state in `weeklyPattern[dayOfWeek]`.
 * 3. Return that state directly. NO inference. NO "base + something".
 * 
 * @returns The effective schedule state for that specific day.
 */
export function getEffectiveSchedule(context: EffectiveScheduleContext): EffectiveSchedule {
    const { representative, dateStr, baseSchedule, specialSchedules } = context
    const dateObj = new Date(dateStr + 'T00:00:00')
    const dayOfWeek = dateObj.getDay() // 0 = Sunday

    // 1. Find the applicable Special Schedule
    // Priority: INDIVIDUAL > GLOBAL
    let activeSpecial: SpecialSchedule | undefined

    const applicableSpecials = specialSchedules.filter(s => {
        // Date check (Inclusive)
        if (dateStr < s.from || dateStr > s.to) return false

        // Scope check
        if (s.scope === 'INDIVIDUAL') {
            return s.targetId === representative.id
        }
        return true // GLOBAL applies to everyone
    })

    // Sort by priority: INDIVIDUAL first
    applicableSpecials.sort((a, b) => {
        if (a.scope === 'INDIVIDUAL' && b.scope === 'GLOBAL') return -1
        if (a.scope === 'GLOBAL' && b.scope === 'INDIVIDUAL') return 1
        return 0
    })

    activeSpecial = applicableSpecials[0]

    // 2. If no special schedule, return BASE (or MIXTO if applicable by contract)
    if (!activeSpecial) {
        const baseStatus = baseSchedule[dayOfWeek]
        if (baseStatus === 'OFF') {
            return { type: 'OFF' }
        }

        // ✅ MIXTO CONTRACTUAL TIENE PRIORIDAD
        // If representative has an active MIXTO contract for this day, honor it
        if (isMixtoActiveForDay(representative, dayOfWeek)) {
            return { type: 'MIXTO' }
        }

        return { type: 'BASE', shift: representative.baseShift }
    }

    // 🛡️ HARD GUARD: Invalid legacy or corrupted special schedule
    if (!activeSpecial.weeklyPattern) {
        console.error(
            '⛔ SpecialSchedule inválido detectado (sin weeklyPattern).',
            activeSpecial
        )
        // Fallback seguro: comportarse como si no hubiera regla (return BASE)
        const baseStatus = baseSchedule[dayOfWeek]
        if (baseStatus === 'OFF') return { type: 'OFF' }
        return { type: 'BASE', shift: representative.baseShift }
    }

    // 3. Resolve from Explicit Pattern
    const patternState = activeSpecial.weeklyPattern[dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6]

    if (patternState === 'OFF') {
        return { type: 'OFF', source: activeSpecial }
    }

    if (patternState === 'MIXTO') {
        // 🟢 SEMANTIC NOTE:
        // MIXTO here means "Eligible for both DAY and NIGHT".
        // It does NOT imply working two shifts.
        // It is a capacity state.
        return { type: 'MIXTO', source: activeSpecial }
    }

    // If DAY or NIGHT
    return {
        type: 'OVERRIDE',
        shift: patternState,
        source: activeSpecial
    }
}
