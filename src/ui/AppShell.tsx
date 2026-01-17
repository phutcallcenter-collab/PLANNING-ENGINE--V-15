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
    padding: '12px 24px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: isActive
      ? '3px solid hsl(0, 0%, 13%)'
      : '3px solid transparent',
    color: isActive ? 'hsl(0, 0%, 10%)' : '#374151',
    fontWeight: isActive ? 600 : 500,
    background: isActive ? 'hsl(0, 0%, 97%)' : 'transparent',
    fontSize: '16px',
    marginRight: '8px',
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
        padding: '0 40px',
        fontFamily: 'sans-serif',
        background: '#F8F9FA',
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '20px',
          paddingBottom: '16px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h1 style={{ color: '#1F2937', margin: 0, fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>
            Control Operativo
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '13px', fontWeight: 400, opacity: 0.7 }}>
            Incidencias y Horarios
          </p>
        </div>
      </header>

      <nav
        style={{
          borderBottom: '1px solid #e5e7eb',
          marginTop: '12px',
          background: '#FFFFFF',
        }}
      >
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
          Planificación Semanal
        </button>
        <button
          style={viewTabStyle(activeView === 'STATS')}
          onClick={() => setActiveView('STATS')}
        >
          Estadísticas y Reportes
        </button>
        <button
          style={viewTabStyle(activeView === 'SETTINGS')}
          onClick={() => setActiveView('SETTINGS')}
        >
          Configuración
        </button>
      </nav>

      <main style={{ paddingTop: '30px' }}>
        {activeView === 'DAILY_LOG' && <DailyLogView />}
        {activeView === 'PLANNING' && (
          <PlanningSection onNavigateToSettings={() => setActiveView('SETTINGS')} />
        )}
        {activeView === 'STATS' && <StatsView />}
        {activeView === 'SETTINGS' && <SettingsView />}
      </main>

      <footer
        style={{
          marginTop: '40px',
          padding: '20px 0',
          borderTop: '1px solid #e5e7eb',
          color: '#9ca3af',
          fontSize: '12px',
          textAlign: 'center',
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
