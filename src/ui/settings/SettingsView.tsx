'use client'

import React, { useState } from 'react'
import { useAppStore, HistoryEvent } from '@/store/useAppStore'
import { useEditMode } from '@/hooks/useEditMode'
import { QuickGuide } from './QuickGuide'
import { HolidayManagement } from './HolidayManagement'
import { RepresentativeManagement } from './RepresentativeManagement'
import {
  Shield,
  History,
  RotateCcw,
  Users,
  Calendar,
  Settings,
} from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import { BackupManagement } from './BackupManagement'
import { CoverageRulesMatrix } from '../coverage/CoverageRulesMatrix'
import { LogViewerModal } from '../components/LogViewerModal'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import { Briefcase } from 'lucide-react'
import { ManagerScheduleManagement } from './ManagerScheduleManagement'
import { AuditPanel } from '@/ui/audit/AuditPanel'

type SettingsTab = 'equipo' | 'calendario' | 'sistema' | 'gerencia'
type EquipoSection = 'representatives' | 'demand'

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sistema')
  const [activeEquipoSection, setActiveEquipoSection] = useState<EquipoSection>('representatives')

  const [showHistory, setShowHistory] = useState(false)
  const [showAudit, setShowAudit] = useState(false)

  const { mode, toggle } = useEditMode()
  // Correction: Check against 'ADMIN_OVERRIDE' based on hook definition
  const isAdvancedMode = mode === 'ADMIN_OVERRIDE'

  const { showToast } = useToast()
  const { resetState, showConfirm, historyEvents } = useAppStore(s => ({
    resetState: s.resetState,
    showConfirm: s.showConfirm,
    historyEvents: s.historyEvents || [],
  }))

  // Sort logs desc
  const sortedHistory = [...historyEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: '⚠️ ¿Reiniciar la planificación?',
      description: (
        <>
          <p>
            Esta acción eliminará todas las incidencias y ajustes manuales
            (ausencias, tardanzas, cambios de turno, etc.).
          </p>
          <p style={{ marginTop: '10px', fontWeight: 500 }}>
            Se conservarán las licencias y vacaciones ya registradas.
          </p>
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
            Esta acción no se puede deshacer.
          </p>
        </>
      ),
      intent: 'danger',
      confirmLabel: 'Sí, reiniciar',
    })

    if (confirmed) {
      resetState(true)
      showToast({
        title: 'Planificación reiniciada',
        message: 'Se han eliminado los cambios manuales.',
        type: 'success'
      })
    }
  }

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: isActive
      ? '2px solid hsl(0, 0%, 13%)'
      : '2px solid transparent',
    color: isActive ? '#111827' : '#4b5563',
    fontWeight: isActive ? 600 : 500,
    background: 'transparent',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  })

  const subTabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid',
    borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
    background: isActive ? 'var(--accent-light)' : 'transparent',
    color: isActive ? 'var(--accent)' : '#6b7280',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  const settingItemStyle: React.CSSProperties = {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
  }

  const renderHistoryItem = (item: HistoryEvent) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#4b5563',
          background: '#f3f4f6',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {item.category}
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          {format(parseISO(item.timestamp), "d MMM yyyy, HH:mm", { locale: es })}
        </span>
      </div>
      <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginTop: '4px' }}>
        {item.title}
      </div>
      {item.description && (
        <div style={{ fontSize: '13px', color: '#4b5563' }}>
          {item.description}
        </div>
      )}
      {(item.subject || item.impact) && (
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '4px', color: '#6b7280' }}>
          {item.subject && <span>👤 {item.subject}</span>}
          {item.impact && <span>⚡ {item.impact}</span>}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding: '0px 20px 40px 20px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Modals */}
      <LogViewerModal
        title="Historial de Cambios"
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        items={sortedHistory}
        renderItem={renderHistoryItem}
        emptyMessage="No hay eventos en el historial reciente."
      />

      {/* Tabs Header */}
      <div
        style={{
          background: 'var(--bg-panel)',
          borderRadius: '12px 12px 0 0',
          padding: '0 16px',
          border: '1px solid var(--border-subtle)',
          borderBottom: 'none',
          marginBottom: 0,
          display: 'flex',
        }}
      >
        <button
          style={tabStyle(activeTab === 'equipo')}
          onClick={() => setActiveTab('equipo')}
        >
          <Users size={16} />
          Equipo y Reglas
        </button>
        <button
          style={tabStyle(activeTab === 'gerencia')}
          onClick={() => setActiveTab('gerencia')}
        >
          <Briefcase size={16} />
          Gerencia
        </button>
        <button
          style={tabStyle(activeTab === 'calendario')}
          onClick={() => setActiveTab('calendario')}
        >
          <Calendar size={16} />
          Calendario
        </button>
        <button
          style={tabStyle(activeTab === 'sistema')}
          onClick={() => setActiveTab('sistema')}
        >
          <Settings size={16} />
          Sistema
        </button>
      </div>

      {/* Tabs Content */}
      <div
        style={{
          background: 'var(--bg-panel)',
          borderRadius: '0 0 12px 12px',
          border: '1px solid var(--border-subtle)',
          borderTop: 'none',
          padding: '24px',
          minHeight: '600px',
        }}
      >
        {activeTab === 'equipo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Internal Sub-Navigation for Equipo */}
            <div style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                style={subTabStyle(activeEquipoSection === 'representatives')}
                onClick={() => setActiveEquipoSection('representatives')}
              >
                Gestión de Representantes
              </button>
              <button
                style={subTabStyle(activeEquipoSection === 'demand')}
                onClick={() => setActiveEquipoSection('demand')}
              >
                Reglas de Demanda
              </button>
            </div>

            {activeEquipoSection === 'representatives' ? (
              <RepresentativeManagement />
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📉 Reglas de Demanda
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Configura la cobertura mínima requerida para cada turno y día.
                  </p>
                </div>
                <CoverageRulesMatrix />
              </div>
            )}
          </div>
        )}

        {activeTab === 'gerencia' && (
          <ManagerScheduleManagement />
        )}

        {activeTab === 'calendario' && (
          <HolidayManagement />
        )}

        {activeTab === 'sistema' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* 1. Backups */}
            <div style={{ ...settingItemStyle, padding: 0, overflow: 'hidden' }}>
              <BackupManagement />
            </div>

            {/* 2. Guía Rápida */}
            <QuickGuide />

            {/* 3. Modo Edición Avanzada */}
            <div style={settingItemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-main)' }}>
                    Modo Edición Avanzada
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Permite modificar semanas pasadas. Usar con precaución.
                  </p>
                </div>
                <button
                  onClick={toggle}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: isAdvancedMode ? 'var(--accent)' : '#e5e7eb',
                    color: isAdvancedMode ? 'white' : '#374151',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isAdvancedMode ? 'Activado' : 'Desactivado'}
                </button>
              </div>
            </div>

            {/* 4. Auditoría (SECURE EMBED) */}
            <div style={settingItemStyle}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-main)' }}>
                Historial y Auditoría
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Registro de acciones operativas y evidencia forense.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Historial Operativo */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      ...buttonStyle,
                      opacity: isAdvancedMode ? 1 : 0.5,
                      cursor: isAdvancedMode ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => isAdvancedMode && setShowHistory(true)}
                  >
                    <History size={16} />
                    Historial Operativo
                  </button>

                  <button
                    style={{
                      ...buttonStyle,
                      opacity: isAdvancedMode ? 1 : 0.5,
                      cursor: isAdvancedMode ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => isAdvancedMode && setShowAudit(prev => !prev)}
                  >
                    <Shield size={16} />
                    {showAudit ? 'Ocultar Auditoría Forense' : 'Auditoría Forense'}
                  </button>
                </div>

                {/* Secure Embedded Panel - Only renders in Admin Mode */}
                {isAdvancedMode && showAudit && (
                  <div
                    style={{
                      marginTop: '16px',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '16px',
                    }}
                  >
                    <AuditPanel embedded />
                  </div>
                )}
              </div>
            </div>

            {/* 5. Zona de Peligro */}
            <div style={{ ...settingItemStyle, borderColor: '#fecaca', background: '#fff5f5' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} />
                Zona de Peligro
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7f1d1d' }}>
                Estas acciones son irreversibles y pueden afectar datos importantes.
              </p>
              <button style={dangerButtonStyle} onClick={handleReset}>
                <RotateCcw size={16} />
                Resetear Planificación
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
