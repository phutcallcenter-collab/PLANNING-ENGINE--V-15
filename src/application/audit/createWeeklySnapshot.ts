import { nanoid } from 'nanoid'
import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'
import { WeeklyPlan, Representative } from '@/domain/types'
import { format, getISOWeek, getISOWeekYear, addDays, parseISO } from 'date-fns'
import { resolveSlotResponsibility } from '@/domain/planning/resolveSlotResponsibility'
import { Coverage } from '@/domain/planning/coverage'

export function createWeeklySnapshot(
    plan: WeeklyPlan,
    weekStart: string,
    actorId: string,
    coverages: Coverage[],
    representatives: Representative[]
): WeeklySnapshot {
    // Helper to derive slots from assignment
    const getAssignedShifts = (day: any): ('DAY' | 'NIGHT')[] => {
        if (!day.assignment || day.assignment.type === 'NONE') return []
        if (day.assignment.type === 'SINGLE') return [day.assignment.shift]
        if (day.assignment.type === 'BOTH') return ['DAY', 'NIGHT']
        return []
    }

    // Initialize metrics map for all agents
    const metricsMap = new Map<string, {
        planned: number
        executed: number
        absences: number
        covered: number
        covering: number
    }>()

    // Pre-fill map to ensure all agents exist
    plan.agents.forEach(a => {
        metricsMap.set(a.representativeId, {
            planned: 0,
            executed: 0,
            absences: 0,
            covered: 0,
            covering: 0
        })
    })

    // ─────────────────────────────────────────────────────────
    // PHASE 1: ITERATE ALL AGENTS (AS SLOT OWNERS)
    // ─────────────────────────────────────────────────────────
    // This ensures every planned slot is visited EXACTLY ONCE.
    // We do NOT iterate "Covering" responsibilities directly.
    // Instead, we "Cross-Post" metrics to the covering rep when we find coverage.

    for (const agent of plan.agents) {
        const ownerMetrics = metricsMap.get(agent.representativeId)!

        for (const [dateStr, day] of Object.entries(agent.days)) {
            const shiftsCheck = getAssignedShifts(day)

            // A. VALID ASSIGNED SLOTS (The Single Source of Truth)
            for (const shift of shiftsCheck) {
                ownerMetrics.planned++

                const responsibility = resolveSlotResponsibility(
                    agent.representativeId,
                    dateStr,
                    shift,
                    plan,
                    coverages,
                    representatives
                )

                if (responsibility.kind === 'RESOLVED') {
                    if (responsibility.source === 'COVERAGE') {
                        // 🟢 COVERAGE SCENARIO

                        if (day.status === 'WORKING') {
                            ownerMetrics.executed++ // Override/Extra work by owner
                        }

                        // 2. Credit the Covering Rep (Cross-Posting)
                        const coveringRepId = responsibility.targetRepId!
                        const coveringMetrics = metricsMap.get(coveringRepId)

                        if (coveringMetrics) {
                            coveringMetrics.covering++ // Effort credit

                            // Does the covering rep show up?
                            const coveringAgent = plan.agents.find(a => a.representativeId === coveringRepId)
                            const coveringDay = coveringAgent?.days[dateStr]

                            // DEDUPLICATION: Check if Covering Rep already has a Base Assignment for this shift.
                            // If they do, the Base Loop (Phase 1.A) will handle Execution/Absence accounting.
                            // We should NOT double count here.
                            const baseAssignedShifts = coveringDay ? getAssignedShifts(coveringDay) : []
                            const isBaseAssigned = baseAssignedShifts.includes(shift)

                            if (coveringDay?.status === 'WORKING') {
                                // SUCCESSFUL COVERAGE
                                ownerMetrics.covered++ // Owner is safely covered

                                // Only credit execution if not already credited by Base Assignment
                                if (!isBaseAssigned) {
                                    coveringMetrics.executed++
                                }
                            } else {
                                // FAILED COVERAGE
                                // Only debit absence if not already debit by Base Assignment
                                if (!isBaseAssigned) {
                                    coveringMetrics.absences++
                                }
                                // Owner remains "Not Covered"
                            }
                        }
                    } else {
                        // 🔵 BASE SCENARIO (Owner Responsibility)
                        if (day.status === 'WORKING') {
                            ownerMetrics.executed++
                        } else {
                            ownerMetrics.absences++
                        }
                    }
                }
            }

            // B. BADGE SAFETY NET (Fallback for missing/empty Coverage records)
            // If we have a CUBRIENDO badge but NO covering metrics were recorded (e.g. Empty Coverages in test),
            // we must credit the effort based on the badge alone.
            // CRITICAL: Only apply this if there are NO assigned shifts (otherwise already handled above)
            if (day.badge === 'CUBRIENDO' && shiftsCheck.length === 0 && ownerMetrics.covering === 0) {
                ownerMetrics.covering++

                if (day.status === 'WORKING') {
                    ownerMetrics.executed++
                } else {
                    // Failed to cover -> Absence
                    ownerMetrics.absences++
                }
            }

            // C. UNPLANNED / VOLUNTARY EXTRA WORK
            // If I am working but have NO planned slots in this shift...
            // AND I am not involved in coverage (checked via 'CUBRIENDO' badge heuristic to avoid complex lookup)
            // If I have CUBRIENDO badge, my execution was likely counted in the Coverage block or Safety Net above.
            if (shiftsCheck.length === 0 && day.status === 'WORKING' && day.badge !== 'CUBRIENDO') {
                ownerMetrics.executed++
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // PHASE 2: CALCULATE DERIVED METRICS & FORMAT RESULT
    // ─────────────────────────────────────────────────────────

    const byRep = plan.agents.map(agent => {
        const m = metricsMap.get(agent.representativeId)!

        // Semantic Logic: Uncovered = Planned - Executed - Absences - Covered
        // This arithmetic invariant ensures accountability
        const uncovered = Math.max(0, m.planned - m.executed - m.absences - m.covered)

        return {
            repId: agent.representativeId,
            plannedSlots: m.planned,
            executedSlots: m.executed,
            absenceSlots: m.absences,
            coveredSlots: m.covered,
            coveringSlots: m.covering,
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
            coverageSlots: byRep.reduce((a, r) => a + r.coveredSlots + r.coveringSlots, 0),
            uncoveredSlots: byRep.reduce((a, r) => a + r.uncoveredSlots, 0),
        },
        byRepresentative: byRep
    }
}
