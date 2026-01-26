export interface WeeklySnapshotDiff {
    fromWeek: string
    toWeek: string

    totalsDelta: {
        plannedSlots: number
        executedSlots: number
        absenceSlots: number
        coverageSlots: number
        uncoveredSlots: number
    }

    byRepresentative: {
        repId: string
        delta: {
            plannedSlots: number
            executedSlots: number
            absenceSlots: number
            coveredSlots: number
            coveringSlots: number
            uncoveredSlots: number
        }
        hasChange: boolean
    }[]
}
