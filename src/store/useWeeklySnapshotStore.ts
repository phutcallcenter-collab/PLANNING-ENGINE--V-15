import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SignedWeeklySnapshot } from '@/domain/audit/SignedWeeklySnapshot'
import { verifySnapshotChain } from '@/application/audit/verifySnapshotChain'

interface WeeklySnapshotState {
    snapshots: SignedWeeklySnapshot[]
    // Returns success/failure. Fails if chain is broken.
    addSnapshot: (s: SignedWeeklySnapshot) => Promise<boolean>
    getSnapshotsForWeek: (weekStart: string) => SignedWeeklySnapshot[]
    getLatestSnapshot: () => SignedWeeklySnapshot | undefined
}

/**
 * ⚠️ SNAPSHOT IMMUTABILITY RULE
 *
 * - Snapshots are historical evidence.
 * - They NEVER update automatically.
 * - Advanced edit DOES NOT mutate snapshots.
 * - Any post-edit audit requires a NEW snapshot.
 *
 * This is a forensic system, not state replication.
 */
export const useWeeklySnapshotStore = create<WeeklySnapshotState>()(
    persist(
        (set, get) => ({
            snapshots: [],

            addSnapshot: async (newSnapshot) => {
                const currentSnapshots = get().snapshots
                const previousSnapshot = currentSnapshots.length > 0
                    ? currentSnapshots[currentSnapshots.length - 1]
                    : undefined

                // 🔒 CORE VALIDATION: Verify Chain Integrity
                const isValid = await verifySnapshotChain(newSnapshot, previousSnapshot)

                if (!isValid) {
                    console.error('⛔ SNAPSHOT REJECTED: Chain verification failed.')
                    return false
                }

                // 🔒 DUPLICATE CHECK: Enforce One Snapshot Per Week
                // Strategy: Last Write Wins (Replace existing)

                set(state => ({
                    snapshots: [
                        ...state.snapshots.filter(s => s.snapshot.weekStart !== newSnapshot.snapshot.weekStart),
                        newSnapshot
                    ]
                }))

                return true
            },

            getSnapshotsForWeek: (weekStart) =>
                get().snapshots.filter(s => s.snapshot.weekStart === weekStart),

            getLatestSnapshot: () => {
                const s = get().snapshots
                return s.length > 0 ? s[s.length - 1] : undefined
            }
        }),
        {
            name: 'weekly-snapshots',
            version: 2, // Bump version for new structure
            migrate: (persistedState: any, version) => {
                if (version < 2) {
                    // Resetting store on major structural change to avoid broken chains
                    // In production we would try to migrate, but for this exercise safety first.
                    return { snapshots: [] }
                }
                return persistedState
            }
        }
    )
)
