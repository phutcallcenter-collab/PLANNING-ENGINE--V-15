import { createInitialState } from '@/domain/state'
import type { PlanningBaseState } from '@/domain/types'
import { normalizeAuditLog } from '@/domain/audit/normalizeAuditEvent'
import { normalizeCommercialGoals } from '@/domain/commercialGoals/defaults'
import { normalizeRepresentatives } from '@/domain/representatives/normalizeRepresentative'
import { openDB, type IDBPDatabase } from 'idb'
import { DOMAIN_VERSION } from '@/store/appStoreConstants'

export const DB_NAME = 'control-puntos-db'
export const STATE_OBJECT_STORE_NAME = 'baseState'
export const STATE_KEY = 'singleton'
const DB_VERSION = 7
const LEGACY_LOCALSTORAGE_KEY = 'control-puntos:v1'

const isBrowserWithIndexedDb =
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
const isBrowserWithLocalStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

function normalizeLoadedState(state: PlanningBaseState): PlanningBaseState {
  state.incidents ??= []
  state.historyEvents ??= []
  state.auditLog = normalizeAuditLog(state.auditLog)
  state.swaps ??= []
  state.specialSchedules ??= []
  state.coverageRules ??= []
  state.representatives = normalizeRepresentatives(state.representatives)
  state.commercialGoals = normalizeCommercialGoals(state.commercialGoals)
  state.managers ??= []
  state.managementSchedules ??= {}
  state.version = DOMAIN_VERSION

  return state
}

async function loadStateFromHttp(baseUrl: string): Promise<PlanningBaseState | null> {
  try {
    const res = await fetch(`${baseUrl}/state`)
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

async function saveStateToHttp(
  baseUrl: string,
  state: PlanningBaseState
): Promise<void> {
  try {
    const res = await fetch(`${baseUrl}/state`, {
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

async function migrateFromLegacyLocalStorage(): Promise<void> {
  if (!isBrowserWithLocalStorage) return

  try {
    const stored = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)
    if (!stored) return

    localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
    console.log('Legacy localStorage data discarded due to new data model.')
  } catch (error) {
    console.error('Failed to clear legacy localStorage:', error)
    try {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
    } catch {
      // ignore cleanup failure
    }
  }
}

export function openDatabase(): Promise<IDBPDatabase> {
  if (!isBrowserWithIndexedDb) {
    const mockDb: any = {
      get: () => Promise.resolve(undefined),
      put: () => Promise.resolve(undefined),
      clear: () => Promise.resolve(undefined),
      close: () => {},
    }

    return Promise.resolve(mockDb as IDBPDatabase)
  }

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STATE_OBJECT_STORE_NAME)) {
        db.createObjectStore(STATE_OBJECT_STORE_NAME)
      }
    },
  })
}

export async function loadState(): Promise<PlanningBaseState | null> {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    const state = await loadStateFromHttp(process.env.NEXT_PUBLIC_BACKEND_URL)
    return state ? normalizeLoadedState(state) : null
  }

  if (!isBrowserWithIndexedDb) {
    return createInitialState()
  }

  try {
    await migrateFromLegacyLocalStorage()

    const db = await openDatabase()
    const state: PlanningBaseState | undefined = await db.get(
      STATE_OBJECT_STORE_NAME,
      STATE_KEY
    )
    db.close()

    if (!state) {
      const initialState = normalizeLoadedState(createInitialState())
      await saveState(initialState)
      return initialState
    }

    const normalizedState = normalizeLoadedState(structuredClone(state))

    if ((state.version ?? 0) < DOMAIN_VERSION) {
      await saveState(normalizedState)
    }

    return normalizedState
  } catch (error) {
    console.error(
      'Failed to load state from IndexedDB, returning initial state:',
      error
    )
    return createInitialState()
  }
}

export async function saveState(state: PlanningBaseState): Promise<void> {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return saveStateToHttp(process.env.NEXT_PUBLIC_BACKEND_URL, state)
  }

  if (!isBrowserWithIndexedDb) return

  try {
    const db = await openDatabase()
    await db.put(STATE_OBJECT_STORE_NAME, structuredClone(state), STATE_KEY)
    db.close()
  } catch (error) {
    console.error('Failed to save state to IndexedDB:', error)
    throw error
  }
}

export async function clearStorage(): Promise<void> {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.warn('clearStorage is not supported for HTTP persistence')
    return
  }

  if (!isBrowserWithIndexedDb) return

  try {
    const db = await openDatabase()
    await db.clear(STATE_OBJECT_STORE_NAME)
    db.close()
  } catch (error) {
    console.error('Failed to clear storage:', error)
  }
}
