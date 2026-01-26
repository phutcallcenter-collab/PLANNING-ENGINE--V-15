import { nanoid } from 'nanoid'
import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'
import { WeeklyPlan } from '@/domain/types'
import { addDays, format, getISOWeek, getISOWeekYear, parseISO } from 'date-fns'

export function createWeeklySnapshot(
    plan: WeeklyPlan,
    weekStart: string,
    actorId: string
): WeeklySnapshot {
    // ─────────────────────────────────────────────────────────
    // PHASE 1: INDEX EXECUTED COVERINGS
    // ─────────────────────────────────────────────────────────
    // Build a map of which dates had covering reps who actually executed
    const executedCoveringByDay = new Map<string, Set<string>>()

    for (const agent of plan.agents) {
        for (const [dateStr, day] of Object.entries(agent.days)) {
            if (
                day.badge === 'CUBRIENDO' &&
                day.status === 'WORKING'
            ) {
                if (!executedCoveringByDay.has(dateStr)) {
                    executedCoveringByDay.set(dateStr, new Set())
                }
                executedCoveringByDay.get(dateStr)!.add(agent.representativeId)
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // PHASE 2: CALCULATE METRICS WITH COVERAGE RESPONSIBILITY
    // ─────────────────────────────────────────────────────────
    const byRep = plan.agents.map(agent => {
        let planned = 0
        let executed = 0
        let absences = 0
        let covered = 0
        let covering = 0

        for (const [dateStr, day] of Object.entries(agent.days)) {
            // Planned slots
            if (day.assignment && day.assignment.type !== 'NONE') planned++

            // Executed slots
            if (day.status === 'WORKING') {
                executed++
            }

            // ─────────────────────────
            // COVERAGE RESPONSIBILITY
            // ─────────────────────────

            if (day.badge === 'CUBRIENDO') {
                covering++

                // Failed commitment → absence
                if (day.status !== 'WORKING') {
                    absences++
                }
            }

            if (day.badge === 'CUBIERTO') {
                // 🔒 CANONICAL RULE: Covered ONLY if someone executed the covering
                const executedCoverExists =
                    (executedCoveringByDay.get(dateStr)?.size ?? 0) > 0

                if (executedCoverExists) {
                    covered++
                }
                // Never absent
            }

            // Standard absence (not involved in coverage)
            if (day.badge === 'AUSENCIA') {
                absences++
            }
        }

        // 🧠 Semantic Logic: Uncovered = Planned - Executed - Absences - Covered
        // This arithmetic invariant ensures accountability
        const uncovered = Math.max(0, planned - executed - absences - covered)

        return {
            repId: agent.representativeId,
            plannedSlots: planned,
            executedSlots: executed,
            absenceSlots: absences,
            coveredSlots: covered,
            coveringSlots: covering,
            uncoveredSlots: uncovered
        }
    })

    const start = parseISO(weekStart)
    const end = addDays(start, 6)
    const isoWeek = `${getISOWeekYear(start)}-W${String(getISOWeek(start)).padStart(2, '0')}`

    return {
        id: nanoid(),
        weekStart,
        weekEnd: format(end, 'yyyy-MM-dd'),
        isoWeek,
        createdAt: new Date().toISOString(),
        createdBy: actorId,
        totals: {
            plannedSlots: byRep.reduce((a, r) => a + r.plannedSlots, 0),
            executedSlots: byRep.reduce((a, r) => a + r.executedSlots, 0),
            absenceSlots: byRep.reduce((a, r) => a + r.absenceSlots, 0),
            coverageSlots: byRep.reduce((a, r) => a + r.coveredSlots + r.coveringSlots, 0), // Full system load (covered + effort)
            uncoveredSlots: byRep.reduce((a, r) => a + r.uncoveredSlots, 0),
        },
        byRepresentative: byRep
    }
}
