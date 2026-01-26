import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'

export function canonicalizeSnapshot(snapshot: WeeklySnapshot) {
    // 🔒 DETERMINISTIC SERIALIZATION
    // We explicitly pick fields and sort arrays to ensure
    // that JSON.stringify(a) === JSON.stringify(b) for semantic equivalence.
    return JSON.stringify({
        weekStart: snapshot.weekStart,
        weekEnd: snapshot.weekEnd,
        isoWeek: snapshot.isoWeek,

        totals: {
            plannedSlots: snapshot.totals.plannedSlots,
            executedSlots: snapshot.totals.executedSlots,
            absenceSlots: snapshot.totals.absenceSlots,
            coverageSlots: snapshot.totals.coverageSlots,
            uncoveredSlots: snapshot.totals.uncoveredSlots
        },

        byRepresentative: [...snapshot.byRepresentative]
            .sort((a, b) => a.repId.localeCompare(b.repId))
            .map(rep => ({
                repId: rep.repId,
                plannedSlots: rep.plannedSlots,
                executedSlots: rep.executedSlots,
                absenceSlots: rep.absenceSlots,
                coveredSlots: rep.coveredSlots,
                coveringSlots: rep.coveringSlots,
                uncoveredSlots: rep.uncoveredSlots
            }))
    })
}
