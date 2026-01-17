import { PlanningBaseState } from '@/domain/types'

/**
 * Exports the current application state as a JSON file
 */
export function exportBackup(state: PlanningBaseState, filename?: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const defaultFilename = `planning-backup-${timestamp}.json`

    const dataStr = JSON.stringify(state, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || defaultFilename
    link.click()

    URL.revokeObjectURL(url)
}

/**
 * Imports application state from a JSON file
 */
export function importBackup(file: File): Promise<PlanningBaseState> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const state = JSON.parse(content) as PlanningBaseState

                // Basic validation
                if (!state.representatives || !state.calendar || !state.version) {
                    throw new Error('Invalid backup file format')
                }

                resolve(state)
            } catch (error) {
                reject(new Error('Failed to parse backup file: ' + (error as Error).message))
            }
        }

        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }

        reader.readAsText(file)
    })
}

/**
 * Gets list of backups from localStorage
 */
export function getBackupHistory(): Array<{ key: string; timestamp: string; size: number }> {
    const backups: Array<{ key: string; timestamp: string; size: number }> = []

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('planning-backup-')) {
            const value = localStorage.getItem(key)
            if (value) {
                backups.push({
                    key,
                    timestamp: key.replace('planning-backup-manual-', '').replace('planning-backup-auto-', '').replace('planning-backup-', ''),
                    size: new Blob([value]).size,
                })
            }
        }
    }

    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

/**
 * Saves a backup to localStorage
 */
export function saveBackupToLocalStorage(state: PlanningBaseState, type: 'manual' | 'auto' = 'manual'): void {
    const timestamp = new Date().toISOString()
    const key = `planning-backup-${type}-${timestamp}`
    const value = JSON.stringify(state)

    try {
        // For auto backups, limit to 5 most recent
        if (type === 'auto') {
            const backups = getBackupHistory().filter(b => b.key.includes('-auto-'))
            if (backups.length >= 5) {
                // Remove oldest auto backups until we have space for one more
                const sorted = backups.sort((a, b) => a.timestamp.localeCompare(b.timestamp)) // Oldest first
                const toRemove = sorted.slice(0, backups.length - 4) // Keep 4, so +1 = 5
                toRemove.forEach(b => localStorage.removeItem(b.key))
            }
        }

        localStorage.setItem(key, value)
        if (type === 'auto') {
            localStorage.setItem('planning-auto-backup-last-run', timestamp)
        }
    } catch (error) {
        // If quota exceeded, try removing oldest manual backup as last resort
        const backups = getBackupHistory()
        if (backups.length > 0) {
            localStorage.removeItem(backups[backups.length - 1].key)
            try {
                localStorage.setItem(key, value)
            } catch {
                console.error("Storage full, cannot save backup")
            }
        } else {
            console.error("Storage full, cannot save backup", error)
        }
    }
}

/**
 * Checks if an auto-backup is needed (every 24h)
 */
export function shouldRunAutoBackup(): boolean {
    const lastRun = localStorage.getItem('planning-auto-backup-last-run')
    if (!lastRun) return true

    const lastDate = new Date(lastRun).getTime()
    const now = new Date().getTime()
    const hoursSince = (now - lastDate) / (1000 * 60 * 60)

    return hoursSince >= 24
}

/**
 * Gets the last backup date (manual or auto)
 */
export function getLastBackupDate(): Date | null {
    const history = getBackupHistory()
    if (history.length === 0) return null
    // History is sorted desc
    return new Date(history[0].timestamp)
}

/**
 * Loads a backup from localStorage
 */
export function loadBackupFromLocalStorage(key: string): PlanningBaseState | null {
    const value = localStorage.getItem(key)
    if (!value) return null

    try {
        return JSON.parse(value) as PlanningBaseState
    } catch {
        return null
    }
}

/**
 * Deletes a backup from localStorage
 */
export function deleteBackupFromLocalStorage(key: string): void {
    localStorage.removeItem(key)
}
