import { WeeklyPlan, Incident, ISODate, ShiftType, DayInfo, Representative, SpecialSchedule } from '@/domain/types'
import { getPlannedAgentsForDay } from './getPlannedAgentsForDay'
import { isSlotOperationallyEmpty } from '@/domain/planning/isSlotOperationallyEmpty'

/**
 * ⚠️ CANONICAL SOURCE OF TRUTH FOR DAILY SHIFT STATISTICS
 * 
 * This function defines the operational reality of the system.
 * DO NOT duplicate this logic in UI components, graphs, or reports.
 * 
 * All components that need planned/present counts MUST consume this function.
 * 
 * @returns { planned: number, present: number }
 * - planned: Agents scheduled to work (excludes LICENCIA/VACACIONES, includes AUSENCIA)
 * - present: Agents who actually showed up (planned - AUSENCIA)
 */
export function getDailyShiftStats(
    weeklyPlan: WeeklyPlan | null,
    incidents: Incident[],
    date: ISODate,
    shift: ShiftType,
    allCalendarDays: DayInfo[],
    representatives: Representative[],
    specialSchedules: SpecialSchedule[] = []
) {
    if (!weeklyPlan) {
        return { planned: 0, present: 0 }
    }

    // 1. Get Canonical Planned List
    const planned = getPlannedAgentsForDay(
        weeklyPlan,
        incidents,
        date,
        shift,
        allCalendarDays,
        representatives,
        specialSchedules
    )

    // 2. Calculate Present (Planned - Absences)
    // Logic: You are present if you were planned AND didn't have an absence recorded against your SLOT.
    // 🧠 OPERATIONAL REALITY: delegated to isSlotOperationallyEmpty
    const present = planned.filter(p => {
        const isEmpty = isSlotOperationallyEmpty(
            p.representativeId,
            date,
            shift,
            incidents
        )
        return !isEmpty
    })

    return {
        planned: planned.length,
        present: present.length,
    }
}
