import { SignedWeeklySnapshot } from '@/domain/audit/SignedWeeklySnapshot'
import { signSnapshotChain } from './signSnapshotChain'

export async function verifySnapshotChain(
    current: SignedWeeklySnapshot,
    previous?: SignedWeeklySnapshot
): Promise<boolean> {
    // 1. Verify links
    if (previous) {
        if (current.previousSignature !== previous.signature) {
            console.error(`🚨 BROKEN CHAIN: Snapshot ${current.snapshot.weekStart} does not link to previous ${previous.snapshot.weekStart}`)
            return false
        }
    } else {
        // Genesis block case
        if (current.previousSignature !== undefined && current.previousSignature !== null) {
            console.error(`🚨 INVALID GENESIS: Snapshot ${current.snapshot.weekStart} has unexpected previous signature`)
            return false
        }
    }

    // 2. Re-calculate signature to verify integrity
    // Note: We use 'undefined' or 'null' normalization?
    // Our signer uses (previousSignature ?? null).
    const expectedSignature = await signSnapshotChain(
        current.snapshot,
        current.previousSignature ?? null
    )

    if (expectedSignature !== current.signature) {
        console.error(`🚨 TAMPERED CONTENT: Snapshot ${current.snapshot.weekStart} content does not match signature.`)
        return false
    }

    return true
}
