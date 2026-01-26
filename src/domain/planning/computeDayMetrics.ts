/**
 * 🧮 COMPUTE DAY METRICS
 * 
 * Pure function that derives display and metrics from plan + reality + coverage.
 * This is where all the "what does this mean?" logic lives.
 * 
 * Rules:
 * - VACATION/LICENSE: Hard block, nothing counts
 * - AUSENCIA: Appears in planner (with badge), doesn't count for incentives
 * - SWAP: Appears in target shift, badge shows coverage
 * - Coverage: Badge overlay, doesn't change plan or reality
 * - Base/Special: Normal appearance
 */

import { DayPlan, DayReality, DayComputed } from './dayResolution'
import { CoverageLookup } from './coverage'

export function computeDayMetrics(
    plan: DayPlan,
    reality: DayReality,
    coverage?: CoverageLookup
): DayComputed {
    // 🔴 Hard Blocks (Vacation/License)
    if (reality.incidentType === 'VACACIONES' || reality.incidentType === 'LICENCIA') {
        return {
            display: {
                appearsInPlanner: false, // Completely off the grid
                appearsInShifts: [],
                badge: reality.incidentType
            },
            metrics: {
                countsAsWorked: false,
                countsForIncentives: false,
                countsAsAbsence: false // It's planned time off, not an absence
            }
        }
    }

    // 🟠 Absence Overlay
    if (reality.incidentType === 'AUSENCIA') {
        // They were supposed to work (plan exists) but didn't show up
        const shifts = resolveShiftsFromAssignment(plan.assignment)

        return {
            display: {
                appearsInPlanner: true, // Show them as scheduled
                appearsInShifts: shifts,
                badge: 'AUSENCIA'
            },
            metrics: {
                countsAsWorked: true,  // Was scheduled to work
                countsForIncentives: false, // Absence disqualifies
                countsAsAbsence: true  // HR needs to know
            }
        }
    }

    // 🔵 Coverage Overlay (NEW)
    // Coverage doesn't change plan or reality, only adds a badge
    if (coverage?.isCovered) {
        const shifts = resolveShiftsFromAssignment(plan.assignment)

        return {
            display: {
                appearsInPlanner: true, // Still appears where planned
                appearsInShifts: shifts, // Still in their original shift
                badge: 'CUBIERTO' // Visual indicator
            },
            metrics: {
                countsAsWorked: true, // Still counts as planned work
                countsForIncentives: true, // Coverage doesn't disqualify
                countsAsAbsence: false
            }
        }
    }

    if (coverage?.isCovering) {
        const shifts = resolveShiftsFromAssignment(plan.assignment)

        return {
            display: {
                appearsInPlanner: true,
                appearsInShifts: shifts, // Stays in their own shift, doesn't move
                badge: 'CUBRIENDO' // Visual indicator
            },
            metrics: {
                countsAsWorked: true,
                countsForIncentives: true, // Covering counts positively
                countsAsAbsence: false
            }
        }
    }

    // 🔵 SWAP Coverage (legacy, kept for backward compatibility)
    if (plan.source === 'SWAP') {
        const shifts = resolveShiftsFromAssignment(plan.assignment)

        return {
            display: {
                appearsInPlanner: true,
                appearsInShifts: shifts,
                badge: 'CUBRIENDO' // Visual indicator of coverage
            },
            metrics: {
                countsAsWorked: true,
                countsForIncentives: true, // Covering counts positively
                countsAsAbsence: false
            }
        }
    }

    // 🟢 Normal Working Day
    if (reality.status === 'WORKING') {
        const shifts = resolveShiftsFromAssignment(plan.assignment)

        return {
            display: {
                appearsInPlanner: true,
                appearsInShifts: shifts,
                badge: undefined // No special indicator
            },
            metrics: {
                countsAsWorked: true,
                countsForIncentives: true,
                countsAsAbsence: false
            }
        }
    }

    // ⚪ Planned OFF (Base schedule)
    return {
        display: {
            appearsInPlanner: false, // Don't show in grid
            appearsInShifts: [],
            badge: undefined
        },
        metrics: {
            countsAsWorked: false,
            countsForIncentives: false,
            countsAsAbsence: false
        }
    }
}

/**
 * Helper: Convert ShiftAssignment to shift visibility array
 */
function resolveShiftsFromAssignment(assignment: any): ('DAY' | 'NIGHT')[] {
    if (assignment.type === 'NONE') return []
    if (assignment.type === 'BOTH') return ['DAY', 'NIGHT']
    if (assignment.type === 'SINGLE') return [assignment.shift]
    return []
}
