import {
  getThemeMode,
  setThemeMode,
  getHasSeenTutorial,
  setHasSeenTutorial,
  getFlag,
  setFlag,
  clearUIFlags,
} from '../../persistence/localStorage'

describe('persistence/localStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('theme mode', () => {
    it('should return null when no theme is set', () => {
      expect(getThemeMode()).toBeNull()
    })

    it('should set and get light theme', () => {
      setThemeMode('light')
      expect(getThemeMode()).toBe('light')
    })

    it('should set and get dark theme', () => {
      setThemeMode('dark')
      expect(getThemeMode()).toBe('dark')
    })

    it('should return null for invalid theme values', () => {
      localStorage.setItem('control-puntos:theme', 'invalid')
      expect(getThemeMode()).toBeNull()
    })
  })

  describe('tutorial status', () => {
    it('should return false when tutorial has not been seen', () => {
      expect(getHasSeenTutorial()).toBe(false)
    })

    it('should set and get tutorial as seen', () => {
      setHasSeenTutorial(true)
      expect(getHasSeenTutorial()).toBe(true)
    })

    it('should set tutorial as not seen', () => {
      setHasSeenTutorial(true)
      setHasSeenTutorial(false)
      expect(getHasSeenTutorial()).toBe(false)
    })
  })

  describe('generic flags', () => {
    it('should return false for unset flags', () => {
      expect(getFlag('some-feature')).toBe(false)
    })

    it('should set and get true flag', () => {
      setFlag('feature-enabled', true)
      expect(getFlag('feature-enabled')).toBe(true)
    })

    it('should set and get false flag', () => {
      setFlag('feature-disabled', false)
      expect(getFlag('feature-disabled')).toBe(false)
    })

    it('should handle multiple flags independently', () => {
      setFlag('flag-1', true)
      setFlag('flag-2', false)
      setFlag('flag-3', true)

      expect(getFlag('flag-1')).toBe(true)
      expect(getFlag('flag-2')).toBe(false)
      expect(getFlag('flag-3')).toBe(true)
    })
  })

  describe('clearUIFlags', () => {
    it('should clear theme mode', () => {
      setThemeMode('dark')
      clearUIFlags()
      expect(getThemeMode()).toBeNull()
    })

    it('should clear tutorial status', () => {
      setHasSeenTutorial(true)
      clearUIFlags()
      expect(getHasSeenTutorial()).toBe(false)
    })

    it('should clear all flags', () => {
      setFlag('flag-1', true)
      setFlag('flag-2', true)
      setFlag('flag-3', true)

      clearUIFlags()

      expect(getFlag('flag-1')).toBe(false)
      expect(getFlag('flag-2')).toBe(false)
      expect(getFlag('flag-3')).toBe(false)
    })

    it('should clear all UI data at once', () => {
      setThemeMode('light')
      setHasSeenTutorial(true)
      setFlag('custom-flag', true)

      clearUIFlags()

      expect(getThemeMode()).toBeNull()
      expect(getHasSeenTutorial()).toBe(false)
      expect(getFlag('custom-flag')).toBe(false)
    })

    it('should not affect non-UI localStorage keys', () => {
      localStorage.setItem('other-app-key', 'some-value')
      setThemeMode('dark')

      clearUIFlags()

      expect(localStorage.getItem('other-app-key')).toBe('some-value')
      expect(getThemeMode()).toBeNull()
    })
  })
})
