'use client'

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react'

export type EditMode = 'NORMAL' | 'ADMIN_OVERRIDE'

interface EditModeContextValue {
  mode: EditMode
  isAdmin: boolean
  enableAdmin: () => void
  disableAdmin: () => void
  toggle: () => void
}

const EditModeContext = createContext<EditModeContextValue | null>(null)

/**
 * Hook to access the edit mode context.
 * Must be used within an EditModeProvider.
 */
export function useEditMode() {
  const context = useContext(EditModeContext)
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider')
  }
  return context
}

/**
 * Provider component that supplies the edit mode context to its children.
 */
export function EditModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<EditMode>('NORMAL')

  const enableAdmin = useCallback(() => {
    setMode('ADMIN_OVERRIDE')
  }, [])

  const disableAdmin = useCallback(() => {
    setMode('NORMAL')
  }, [])

  const toggle = useCallback(() => {
    setMode(prev => (prev === 'NORMAL' ? 'ADMIN_OVERRIDE' : 'NORMAL'))
  }, [])

  const value: EditModeContextValue = useMemo(
    () => ({
      mode,
      isAdmin: mode === 'ADMIN_OVERRIDE',
      enableAdmin,
      disableAdmin,
      toggle,
    }),
    [mode, enableAdmin, disableAdmin, toggle]
  )

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  )
}
