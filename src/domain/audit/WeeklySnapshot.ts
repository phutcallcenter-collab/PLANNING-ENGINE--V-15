import { ISODate } from '@/domain/types'

export interface WeeklySnapshot {
    id: string
    weekStart: ISODate
    weekEnd: ISODate
    isoWeek: string // YYYY-Www

    createdAt: string
    createdBy: string // actorId

    totals: {
        plannedSlots: number
        executedSlots: number
        absenceSlots: number
        coverageSlots: number
        uncoveredSlots: number
    }

    byRepresentative: {
        repId: string
        plannedSlots: number
        executedSlots: number
        absenceSlots: number
        coveredSlots: number
        coveringSlots: number
        uncoveredSlots: number
    }[]
}
