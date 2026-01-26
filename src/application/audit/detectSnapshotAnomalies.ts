import { WeeklySnapshotDiff } from '@/domain/audit/WeeklySnapshotDiff'

export type AnomalyLevel = 'info' | 'warning' | 'critical'

export interface SnapshotAnomaly {
    level: AnomalyLevel
    scope: 'GLOBAL' | 'REP'
    repId?: string
    message: string
}

export function detectSnapshotAnomalies(
    diff: WeeklySnapshotDiff
): SnapshotAnomaly[] {
    const anomalies: SnapshotAnomaly[] = []

    // ─────────────────────────────
    // GLOBAL INVARIANTS
    // ─────────────────────────────

    // Absences increase without compensation in execution or coverage
    if (
        diff.totalsDelta.absenceSlots > 0 &&
        diff.totalsDelta.executedSlots >= 0 &&
        diff.totalsDelta.coverageSlots <= 0
    ) {
        anomalies.push({
            level: 'warning',
            scope: 'GLOBAL',
            message: 'Aumentan ausencias sin compensación en ejecución ni cobertura'
        })
    }

    // Executed exceeds planned (system-level corruption)
    if (diff.totalsDelta.executedSlots > diff.totalsDelta.plannedSlots) {
        anomalies.push({
            level: 'critical',
            scope: 'GLOBAL',
            message: 'Ejecutados globales superan planificados'
        })
    }

    // ─────────────────────────────
    // PER-REP INVARIANTS
    // ─────────────────────────────

    for (const rep of diff.byRepresentative) {
        if (!rep.hasChange) continue

        const d = rep.delta

        // Executed > Planned (hard violation)
        if (d.executedSlots > d.plannedSlots) {
            anomalies.push({
                level: 'critical',
                scope: 'REP',
                repId: rep.repId,
                message: 'Trabajados supera planificados'
            })
        }

        // Covers others without being planned
        // Note: coveringSlots is not part of the arithmetic sum for the rep's OWN line, 
        // but semantically, if you have 0 planned slots, you shouldn't be covering anyone properly 
        // (unless you were called in, which implies an override => planned).
        // If plannedSlots <= 0, it means you were OFF.
        // We add strict check: if you executed slots, maybe it's valid emergency cover.
        if (d.coveringSlots > 0 && d.plannedSlots <= 0 && d.executedSlots <= 0) {
            anomalies.push({
                level: 'critical',
                scope: 'REP',
                repId: rep.repId,
                message: 'Cubre turnos sin estar planificado ni ejecutar'
            })
        }

        // Arithmetic invariant broken
        const sum =
            d.executedSlots +
            d.absenceSlots +
            d.coveredSlots +
            d.uncoveredSlots

        if (sum !== d.plannedSlots) {
            anomalies.push({
                level: 'critical',
                scope: 'REP',
                repId: rep.repId,
                message: 'Inconsistencia aritmética en distribución de slots'
            })
        }
    }

    return anomalies
}
