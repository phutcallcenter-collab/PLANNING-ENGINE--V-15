import { WeeklySnapshot } from './WeeklySnapshot'

export interface SignedWeeklySnapshot {
    snapshot: WeeklySnapshot
    signature: string

    // 🔗 Chain Logic (Blockchain-lite)
    previousSignature?: string

    // 🔒 Official Status
    sealed: boolean
    sealedAt?: string
    sealedBy?: string
}
