import { WeeklyPresence, DayInfo, ShiftType, Representative, SpecialSchedule } from '@/domain/types'
import { getEffectiveSchedule } from '@/application/scheduling/specialScheduleAdapter'

/**
 * ⚠️ CANONICAL RULE: Identity vs. Operation
 * 
 * This function is the single source of truth for deciding if a representative
 * "belongs" to a shift within a given week.
 * 
 * It determines visibility based on the EFFECTIVE STATE, not just identity.
 * - MIXTO belongs to BOTH shifts.
 * - OFF belongs to NEITHER.
 * - BASE/OVERRIDE belongs to their specific shift.
 * 
 * @param agentPlan - The weekly plan for the agent (may be empty/partial)
 * @param weekDays - Days in the current view
 * @param shift - The active shift view ('DAY' or 'NIGHT')
 * @param rep - The representative entity
 * @param specialSchedules - All special schedules
 */
export function belongsToShiftThisWeek(
    agentPlan: WeeklyPresence,
    weekDays: DayInfo[],
    shift: ShiftType,
    rep: Representative,
    specialSchedules: SpecialSchedule[]
): boolean {
    return weekDays.some(day => {
        const effective = getEffectiveSchedule({
            representative: rep,
            dateStr: day.date,
            baseSchedule: rep.baseSchedule,
            specialSchedules,
        })

        // OFF never belongs to a working shift view (unless we want to show OFFs, 
        // but usually planner shows available capacity. Actually, if they are OFF, 
        // they usually don't appear in the "Working" list unless filtered differently.
        // The user requirement says: "OFF never belongs" (implied by "OFF never belongs" in test).
        if (effective.type === 'OFF') return false

        // MIXTO belongs to both
        if (effective.type === 'MIXTO') return true

        // 🧠 UI VISIBILITY: Native Mix Profile
        if (effective.type === 'BASE' && allowsDualVisibility(rep, day.date)) {
            return true
        }

        // BASE / OVERRIDE: match shift
        if (effective.type === 'BASE' || effective.type === 'OVERRIDE') {
            return effective.shift === shift
        }

        return false
    })
}

/**
 * Checks if a representative has a contract (MixProfile) that allows
 * visibility in both shifts for a specific date, regardless of their base shift.
 */
function allowsDualVisibility(rep: Representative, dateStr: string): boolean {
    if (!rep.mixProfile) return false

    // Use T12:00:00 to safely get the day of week without TZ/DST edge cases
    const dateObj = new Date(dateStr + 'T12:00:00')
    const dow = dateObj.getDay()

    const isWeekend = dow === 0 || dow === 5 || dow === 6 // Sun, Fri, Sat
    const isWeekday = dow >= 1 && dow <= 4 // Mon-Thu

    if (rep.mixProfile.type === 'WEEKEND' && isWeekend) return true
    if (rep.mixProfile.type === 'WEEKDAY' && isWeekday) return true

    return false
}
