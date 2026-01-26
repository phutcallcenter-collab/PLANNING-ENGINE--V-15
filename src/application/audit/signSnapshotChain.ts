import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'
import { canonicalizeSnapshot } from './canonicalizeSnapshot'

export async function signSnapshotChain(
    snapshot: WeeklySnapshot,
    previousSignature: string | null
): Promise<string> {
    const payload = JSON.stringify({
        snapshot: canonicalizeSnapshot(snapshot), // The semantic content
        previousSignature: previousSignature ?? null // The "Block Header" link
    })

    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)

    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}
