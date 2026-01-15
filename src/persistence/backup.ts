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
                    timestamp: key.replace('planning-backup-', ''),
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
export function saveBackupToLocalStorage(state: PlanningBaseState): void {
    const timestamp = new Date().toISOString()
    const key = `planning-backup-${timestamp}`
    const value = JSON.stringify(state)

    try {
        localStorage.setItem(key, value)
    } catch (error) {
        // If quota exceeded, remove oldest backup and try again
        const backups = getBackupHistory()
        if (backups.length > 0) {
            localStorage.removeItem(backups[backups.length - 1].key)
            localStorage.setItem(key, value)
        } else {
            throw error
        }
    }
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
