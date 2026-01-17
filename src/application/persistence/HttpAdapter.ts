import { PersistenceAdapter } from './PersistenceAdapter'
import { PlanningBaseState } from '@/domain/types'

export class HttpAdapter implements PersistenceAdapter {
    constructor(private baseUrl: string) { }

    async loadState(): Promise<PlanningBaseState | null> {
        try {
            const res = await fetch(`${this.baseUrl}/state`)
            if (!res.ok) {
                if (res.status === 404) return null
                throw new Error(`Failed to load state: ${res.statusText}`)
            }
            return await res.json()
        } catch (error) {
            console.error('HTTP Load Error:', error)
            return null
        }
    }

    async saveState(state: PlanningBaseState): Promise<void> {
        try {
            const res = await fetch(`${this.baseUrl}/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state),
            })

            if (!res.ok) {
                throw new Error(`Failed to save state: ${res.statusText}`)
            }
        } catch (error) {
            console.error('HTTP Save Error:', error)
            throw error
        }
    }
}
