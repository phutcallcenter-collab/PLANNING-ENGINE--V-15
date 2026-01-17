/**
 * localStorage helpers for UI flags and preferences.
 * These are separate from IndexedDB persistence to keep UI state lightweight.
 * SSR-safe: all functions handle cases where localStorage is unavailable.
 */

const THEME_KEY = 'control-puntos:theme'
const TUTORIAL_KEY = 'control-puntos:tutorial-seen'
const FLAG_PREFIX = 'control-puntos:flag:'

// Check if we're in a browser environment with localStorage support
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

/**
 * Get the current theme mode
 */
export function getThemeMode(): 'light' | 'dark' | null {
  if (!isBrowser) return null

  try {
    const theme = localStorage.getItem(THEME_KEY)
    if (theme === 'light' || theme === 'dark') {
      return theme
    }
    return null
  } catch (error) {
    console.error('Failed to get theme mode:', error)
    return null
  }
}

/**
 * Set the theme mode
 */
export function setThemeMode(mode: 'light' | 'dark'): void {
  if (!isBrowser) return

  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch (error) {
    console.error('Failed to set theme mode:', error)
  }
}

/**
 * Check if user has seen the tutorial
 */
export function getHasSeenTutorial(): boolean {
  if (!isBrowser) return false

  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'true'
  } catch (error) {
    console.error('Failed to get tutorial status:', error)
    return false
  }
}

/**
 * Mark tutorial as seen
 */
export function setHasSeenTutorial(seen: boolean): void {
  if (!isBrowser) return

  try {
    localStorage.setItem(TUTORIAL_KEY, String(seen))
  } catch (error) {
    console.error('Failed to set tutorial status:', error)
  }
}

/**
 * Get a generic boolean flag
 */
export function getFlag(key: string): boolean {
  if (!isBrowser) return false

  try {
    return localStorage.getItem(FLAG_PREFIX + key) === 'true'
  } catch (error) {
    console.error(`Failed to get flag ${key}:`, error)
    return false
  }
}

/**
 * Set a generic boolean flag
 */
export function setFlag(key: string, value: boolean): void {
  if (!isBrowser) return

  try {
    localStorage.setItem(FLAG_PREFIX + key, String(value))
  } catch (error) {
    console.error(`Failed to set flag ${key}:`, error)
  }
}

/**
 * Clear all UI flags (does not touch IndexedDB data)
 */
export function clearUIFlags(): void {
  if (!isBrowser) return

  try {
    // Remove known keys
    localStorage.removeItem(THEME_KEY)
    localStorage.removeItem(TUTORIAL_KEY)

    // Remove all flag keys
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith(FLAG_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.error('Failed to clear UI flags:', error)
  }
}
