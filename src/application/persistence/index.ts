import { LocalStorageAdapter } from './LocalStorageAdapter'
import { HttpAdapter } from './HttpAdapter'
import { PersistenceAdapter } from './PersistenceAdapter'

// Singleton instance
export const persistence: PersistenceAdapter =
    process.env.NEXT_PUBLIC_BACKEND_URL
        ? new HttpAdapter(process.env.NEXT_PUBLIC_BACKEND_URL)
        : new LocalStorageAdapter()
