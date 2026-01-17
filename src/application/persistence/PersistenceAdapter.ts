import { PlanningBaseState } from '@/domain/types'

export interface PersistenceAdapter {
    loadState(): Promise<PlanningBaseState | null>
    saveState(state: PlanningBaseState): Promise<void>
}
