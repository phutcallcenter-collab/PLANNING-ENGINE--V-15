import { WeeklySnapshot } from '@/domain/audit/WeeklySnapshot'
import { canonicalizeSnapshot } from './canonicalizeSnapshot'

export async function signSnapshot(snapshot: WeeklySnapshot): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(canonicalizeSnapshot(snapshot))

    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export interface SignedWeeklySnapshot {
    snapshot: WeeklySnapshot
    signature: string
}

export async function verifySnapshot(
    signed: SignedWeeklySnapshot
): Promise<boolean> {
    const expected = await signSnapshot(signed.snapshot)
    return expected === signed.signature
}
