import { PersistenceAdapter } from './PersistenceAdapter'
import { PlanningBaseState } from '@/domain/types'
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'control-puntos-db'
const STATE_OBJECT_STORE_NAME = 'baseState'
const STATE_KEY = 'singleton'
const DB_VERSION = 7

const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

export class LocalStorageAdapter implements PersistenceAdapter {
    async loadState(): Promise<PlanningBaseState | null> {
        if (!isBrowser) return null

        try {
            const db = await this.openDatabase()
            const state: PlanningBaseState | undefined = await db.get(
                STATE_OBJECT_STORE_NAME,
                STATE_KEY
            )
            db.close()
            return state ?? null
        } catch (error) {
            console.error('Failed to load state from IndexedDB:', error)
            return null
        }
    }

    async saveState(state: PlanningBaseState): Promise<void> {
        if (!isBrowser) return

        try {
            const db = await this.openDatabase()
            await db.put(STATE_OBJECT_STORE_NAME, state, STATE_KEY)
            db.close()
        } catch (error) {
            console.error('Failed to save state to IndexedDB:', error)
            throw error
        }
    }

    private openDatabase(): Promise<IDBPDatabase> {
        if (!isBrowser) {
            return Promise.resolve({
                get: () => Promise.resolve(undefined),
                put: () => Promise.resolve(undefined),
                close: () => { },
            } as any)
        }

        return openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STATE_OBJECT_STORE_NAME)) {
                    db.createObjectStore(STATE_OBJECT_STORE_NAME)
                }
            },
        })
    }
}
