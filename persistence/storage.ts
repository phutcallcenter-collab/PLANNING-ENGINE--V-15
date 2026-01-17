import type { PlanningBaseState } from '../src/domain/types'
import { createInitialState } from '../src/domain/state'
import { openDB, type IDBPDatabase } from 'idb'

export const DB_NAME = 'control-puntos-db'
export const STATE_OBJECT_STORE_NAME = 'baseState'
const STATE_KEY = 'singleton'
const DB_VERSION = 7 // New CoverageRule structure
const LEGACY_LOCALSTORAGE_KEY = 'control-puntos:v1'

// Check if we're in a browser environment with IndexedDB support
const isBrowser =
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

/**
 * Opens the IndexedDB database, creating or upgrading it if necessary.
 */
export function openDatabase(): Promise<IDBPDatabase> {
  if (!isBrowser) {
    // Return a mock object for SSR environments.
    const mockDb: any = {
      get: () => Promise.resolve(undefined),
      put: () => Promise.resolve(undefined),
      clear: () => Promise.resolve(undefined),
      close: () => {},
    }
    return Promise.resolve(mockDb as IDBPDatabase)
  }

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STATE_OBJECT_STORE_NAME)) {
        db.createObjectStore(STATE_OBJECT_STORE_NAME)
      }
      // For version 7, the CoverageRule model has changed.
      // The loadState logic will handle creating a new initial state
      // if the loaded version is old, so no specific migration is needed here.
    },
  })
}

/**
 * Migrate data from localStorage to IndexedDB if it exists.
 */
async function migrateFromLocalStorage(): Promise<void> {
  if (!isBrowser || typeof window.localStorage === 'undefined') {
    return
  }

  try {
    const stored = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY)
    if (!stored) {
      return
    }

    // Since the data model is now completely different, we just discard legacy data.
    localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
    console.log('Legacy localStorage data discarded due to new data model.')
  } catch (error) {
    console.error('Failed to clear legacy localStorage:', error)
    // Attempt to remove it anyway to prevent looping
    try {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Load state from IndexedDB.
 */
export async function loadState(): Promise<PlanningBaseState> {
  if (!isBrowser) {
    return createInitialState()
  }

  try {
    // This is a one-time operation that will only run if legacy data exists.
    await migrateFromLocalStorage()

    const db = await openDatabase()
    const state: PlanningBaseState | undefined = await db.get(
      STATE_OBJECT_STORE_NAME,
      STATE_KEY
    )

    // If state is invalid or version is outdated, create and persist a new one.
    if (!state || !state.version || state.version < DB_VERSION) {
      console.log(
        'No valid state found or old version detected, creating initial state.'
      )
      const initialState = createInitialState()
      await saveState(initialState)
      return initialState
    }
    // Ensure incidents property exists for backward compatibility
    if (!state.incidents) {
      state.incidents = []
    }
    if (!state.historyEvents) {
      state.historyEvents = []
    }
    if (!state.auditLog) {
      state.auditLog = []
    }
    if (!state.swaps) {
      state.swaps = []
    }


    return structuredClone(state)
  } catch (error) {
    console.error(
      'Failed to load state from IndexedDB, returning initial state:',
      error
    )
    return createInitialState()
  }
}

/**
 * Save state to IndexedDB.
 */
export async function saveState(state: PlanningBaseState): Promise<void> {
  if (!isBrowser) return

  try {
    const clonedState = structuredClone(state)
    const db = await openDatabase()
    await db.put(STATE_OBJECT_STORE_NAME, clonedState, STATE_KEY)
  } catch (error) {
    console.error('Failed to save state to IndexedDB:', error)
    throw error
  }
}

/**
 * Clear all main state storage.
 */
export async function clearStorage(): Promise<void> {
  if (!isBrowser) return

  try {
    const db = await openDatabase()
    await db.clear(STATE_OBJECT_STORE_NAME)
  } catch (error) {
    console.error('Failed to clear storage:', error)
  }
}
