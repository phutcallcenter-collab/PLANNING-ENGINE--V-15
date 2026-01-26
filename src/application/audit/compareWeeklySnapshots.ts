import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'
import { WeeklySnapshotDiff } from '@/domain/audit/WeeklySnapshotDiff'

export function compareWeeklySnapshots(
    from: WeeklySnapshot,
    to: WeeklySnapshot
): WeeklySnapshotDiff {
    const repMapFrom = new Map(
        from.byRepresentative.map(r => [r.repId, r])
    )

    const repMapTo = new Map(
        to.byRepresentative.map(r => [r.repId, r])
    )

    const allRepIds = new Set([
        ...repMapFrom.keys(),
        ...repMapTo.keys()
    ])

    const byRepresentative = Array.from(allRepIds).map(repId => {
        const a = repMapFrom.get(repId)
        const b = repMapTo.get(repId)

        const delta = {
            plannedSlots: (b?.plannedSlots ?? 0) - (a?.plannedSlots ?? 0),
            executedSlots: (b?.executedSlots ?? 0) - (a?.executedSlots ?? 0),
            absenceSlots: (b?.absenceSlots ?? 0) - (a?.absenceSlots ?? 0),
            coveredSlots: (b?.coveredSlots ?? 0) - (a?.coveredSlots ?? 0),
            coveringSlots: (b?.coveringSlots ?? 0) - (a?.coveringSlots ?? 0),
            uncoveredSlots: (b?.uncoveredSlots ?? 0) - (a?.uncoveredSlots ?? 0),
        }

        const hasChange = Object.values(delta).some(v => v !== 0)

        return { repId, delta, hasChange }
    })

    return {
        fromWeek: from.weekStart,
        toWeek: to.weekStart,

        totalsDelta: {
            plannedSlots: to.totals.plannedSlots - from.totals.plannedSlots,
            executedSlots: to.totals.executedSlots - from.totals.executedSlots,
            absenceSlots: to.totals.absenceSlots - from.totals.absenceSlots,
            coverageSlots: to.totals.coverageSlots - from.totals.coverageSlots,
            uncoveredSlots: to.totals.uncoveredSlots - from.totals.uncoveredSlots,
        },

        byRepresentative
    }
}
