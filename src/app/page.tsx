'use client'

import AppShellContent from '../ui/AppShell'
import { ToastProvider } from '@/ui/components/ToastProvider'
import { EditModeProvider } from '@/hooks/useEditMode'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { saveState } from '@/persistence/storage'
import { PlanningBaseState } from '@/domain/types'

// Function to pick the state to be persisted
const stateToPersist = (state: any): PlanningBaseState => {
  const {
    representatives,
    incidents,
    calendar,
    coverageRules,
    swaps,
    specialSchedules,
    historyEvents,
    auditLog,
    managers,
    managementSchedules,
    version,
  } = state
  return {
    representatives,
    incidents,
    calendar,
    coverageRules,
    swaps,
    specialSchedules,
    historyEvents,
    auditLog,
    managers,
    managementSchedules,
    version,
  }
}

// Moved from the store to be activated once at the app root.
function enableAutoSave() {
  let saveTimer: number | undefined

  useAppStore.subscribe(state => {
    if (state.isLoading) return
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveState(stateToPersist(state))
    }, 300)
  })
}


export default function Page() {
  const { isLoading, initialize } = useAppStore(s => ({
    isLoading: s.isLoading,
    initialize: s.initialize,
  }));

  useEffect(() => {
    initialize();
    enableAutoSave();
  }, [initialize]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        fontSize: '1.2rem',
        color: '#6b7280'
      }}>
        Cargando estado de la aplicación...
      </div>
    )
  }

  return (
    <ToastProvider>
      <EditModeProvider>
        <AppShellContent />
      </EditModeProvider>
    </ToastProvider>
  )
}
