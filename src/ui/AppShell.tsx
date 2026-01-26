'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { PlanningSection } from './planning/PlanningSection'
import { DailyLogView } from './logs/DailyLogView'
import { StatsView } from './stats/StatsView'
import { SettingsView } from './settings/SettingsView'
import { ConfirmDialog } from './components/ConfirmDialog'
import { UndoToast } from './components/UndoToast'
import { VacationConfirmation } from './components/VacationConfirmation'
import { PersonDetailModal } from './monthly/PersonDetailModal'
import { AnimatePresence } from 'framer-motion'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { MixedShiftConfirmModal } from './planning/MixedShiftConfirmModal'


function AppShellInner() {
  const {
    isLoading,
    confirmState,
    handleConfirm,
    representatives,
    incidents,
    detailModalState,
    closeDetailModal,
    mixedShiftConfirmModalState,
    handleMixedShiftConfirm,
    vacationConfirmationState,
    closeVacationConfirmation,
  } = useAppStore(s => ({
    isLoading: s.isLoading,
    confirmState: s.confirmState,
    handleConfirm: s.handleConfirm,
    representatives: s.representatives,
    incidents: s.incidents,
    detailModalState: s.detailModalState,
    closeDetailModal: s.closeDetailModal,
    mixedShiftConfirmModalState: s.mixedShiftConfirmModalState,
    handleMixedShiftConfirm: s.handleMixedShiftConfirm,
    vacationConfirmationState: s.vacationConfirmationState,
    closeVacationConfirmation: s.closeVacationConfirmation,
  }))

  // ✅ AUTO-BACKUP LOGIC
  useEffect(() => {
    // Wait for app to be stable
    if (!isLoading) {
      import('@/persistence/backup').then(({ shouldRunAutoBackup, saveBackupToLocalStorage }) => {
        if (shouldRunAutoBackup()) {
          console.log('Running auto-backup...')
          const fullState = useAppStore.getState()
          saveBackupToLocalStorage(fullState, 'auto')
        }
      })
    }
  }, [isLoading])

  const [activeView, setActiveView] = useState<'PLANNING' | 'DAILY_LOG' | 'STATS' | 'SETTINGS'>('DAILY_LOG')

  // Pre-fetch the summary for the modal
  const monthlySummary = useMonthlySummary(detailModalState.month)

  const viewTabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '0 var(--space-md)',
    cursor: 'pointer',
    border: 'none',
    borderBottom: isActive
      ? '3px solid var(--accent)'
      : '3px solid transparent',
    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
    fontWeight: isActive ? 600 : 500,
    background: 'transparent',
    fontSize: 'var(--font-size-base)',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease-in-out',
  })

  if (isLoading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#555' }}>
        Cargando estado de la aplicación...
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        background: 'var(--bg-app)',
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          padding: '0 var(--space-xl)',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: 'var(--text-main)' }}
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M9 2C9 1.44772 9.44772 1 10 1H14C14.5523 1 15 1.44772 15 2V3H17C18.6569 3 20 4.34315 20 6V20C20 21.6569 18.6569 23 17 23H7C5.34315 23 4 21.6569 4 20V6C4 4.34315 5.34315 3 7 3H9V2ZM15 3V4C15 4.55228 14.5523 5 14 5H10C9.44772 5 9 4.55228 9 4V3H15ZM10.2929 13.2929C9.90237 13.6834 9.2692 13.6834 8.87868 13.2929L6.70711 11.1213C6.31658 10.7308 6.31658 10.0976 6.70711 9.70711C7.09763 9.31658 7.7308 9.31658 8.12132 9.70711L9.58579 11.1716L15.8787 4.87868C16.2692 4.48816 16.9024 4.48816 17.2929 4.87868C17.6834 5.2692 17.6834 5.90237 17.2929 6.29289L10.2929 13.2929Z" />
          </svg>
          <span style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-main)'
          }}>
            Control Operativo
          </span>
        </div>

        <nav style={{ display: 'flex', height: '100%', gap: 'var(--space-sm)' }}>
          <button
            style={viewTabStyle(activeView === 'DAILY_LOG')}
            onClick={() => setActiveView('DAILY_LOG')}
          >
            Registro Diario
          </button>
          <button
            style={viewTabStyle(activeView === 'PLANNING')}
            onClick={() => setActiveView('PLANNING')}
          >
            Planificación
          </button>
          <button
            style={viewTabStyle(activeView === 'STATS')}
            onClick={() => setActiveView('STATS')}
          >
            Reportes
          </button>
          <button
            style={viewTabStyle(activeView === 'SETTINGS')}
            onClick={() => setActiveView('SETTINGS')}
          >
            Configuración
          </button>

        </nav>
      </header>

      <main style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
        {activeView === 'DAILY_LOG' && <DailyLogView />}
        {activeView === 'PLANNING' && (
          <PlanningSection onNavigateToSettings={() => setActiveView('SETTINGS')} />
        )}
        {activeView === 'STATS' && <StatsView />}
        {activeView === 'SETTINGS' && <SettingsView />}

      </main>

      <footer
        style={{
          padding: 'var(--space-lg) 0',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-faint)',
          fontSize: 'var(--font-size-xs)',
          textAlign: 'center',
          marginTop: 'auto'
        }}
      >
      </footer>

      {confirmState && (
        <ConfirmDialog
          open={!!confirmState}
          title={confirmState.options.title}
          description={confirmState.options.description}
          intent={confirmState.options.intent}
          confirmLabel={confirmState.options.confirmLabel}
          cancelLabel={confirmState.options.cancelLabel}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}

      {vacationConfirmationState?.isOpen && (
        <VacationConfirmation
          isOpen={vacationConfirmationState.isOpen}
          repName={vacationConfirmationState.repName}
          startDate={vacationConfirmationState.startDate}
          endDate={vacationConfirmationState.endDate}
          returnDate={vacationConfirmationState.returnDate}
          workingDays={vacationConfirmationState.workingDays}
          onClose={closeVacationConfirmation}
        />
      )}

      <UndoToast />

      {mixedShiftConfirmModalState?.isOpen && (
        <MixedShiftConfirmModal
          activeShift={mixedShiftConfirmModalState.activeShift}
          onClose={() => handleMixedShiftConfirm(null)}
          onSelect={handleMixedShiftConfirm}
        />
      )}

      <AnimatePresence>
        {detailModalState.isOpen && detailModalState.personId && monthlySummary && (
          <PersonDetailModal
            summary={monthlySummary}
            personId={detailModalState.personId}
            onClose={closeDetailModal}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// The main export remains the same, but AppShellInner is now connected to the store
export default function AppShellContent() {
  return (
    <AppShellInner />
  )
}
