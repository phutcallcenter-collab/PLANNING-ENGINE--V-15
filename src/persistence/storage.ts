import { persistence } from '@/application/persistence'
import type { PlanningBaseState } from '@/domain/types'

export async function loadState(): Promise<PlanningBaseState | null> {
  const state = await persistence.loadState()
  if (!state) return null

  // --- Data Integrity & Migration ---
  // Ensure all top-level arrays exist to prevent crashes on older states.
  state.incidents ??= []
  state.historyEvents ??= []
  state.auditLog ??= []
  state.swaps ??= []
  state.specialSchedules ??= []
  state.coverageRules ??= []
  state.representatives ??= []


  return state
}

export async function saveState(state: PlanningBaseState): Promise<void> {
  return persistence.saveState(state)
}

/**
 * @deprecated Use persistence.saveState or clear manually if needed.
 */
export async function clearStorage(): Promise<void> {
  // Option: Expose a clear method on adapter if needed, but for now strict to contract.
  console.warn('clearStorage is deprecated/not directly supported by adapter interface')
}
