'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useEditMode } from '@/hooks/useEditMode'
import { HolidayManagement } from './HolidayManagement'
import { RepresentativeManagement } from './RepresentativeManagement'
import {
  Calendar,
  Shield,
  RotateCcw,
  Download,
  Upload,
  History,
  FileCheck,
  Users,
} from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import { downloadJson } from '@/application/backup/export'
import { parseBackup } from '@/application/backup/import'
import { BackupPayload } from '@/application/backup/types'
import {
    getLastBackupTimestamp,
    getLastRestoreTimestamp,
} from '@/persistence/localStorage'

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<
    'representatives' | 'holidays' | 'system'
  >('representatives')
  const { mode, toggle } = useEditMode()
  const { showToast } = useToast()
  const { resetState, showConfirm, exportState, importState } = useAppStore(
    s => ({
      resetState: s.resetState,
      showConfirm: s.showConfirm,
      exportState: s.exportState,
      importState: s.importState,
    })
  )

  // State to hold the timestamps
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [lastRestore, setLastRestore] = useState<string | null>(null)

  // Effect to read timestamps from localStorage on component mount
  useEffect(() => {
    setLastBackup(getLastBackupTimestamp())
    setLastRestore(getLastRestoreTimestamp())
  }, [])


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
          <p
            style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            Esta acción no se puede deshacer.
          </p>
        </>
      ),
      intent: 'danger',
      confirmLabel: 'Sí, reiniciar',
    })

    if (confirmed) {
      resetState(true)
    }
  }

  const handleExport = () => {
    const data = exportState()
    downloadJson(
      `planning-backup-${new Date().toISOString().split('T')[0]}.json`,
      data
    )
    setLastBackup(new Date().toISOString())
    showToast({
      title: 'Éxito',
      message: 'Respaldo generado y descargado.',
      type: 'success',
    })
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const confirmed = await showConfirm({
      title: '⚠️ ¿Importar Estado?',
      description:
        'Esto sobreescribirá todo el estado actual de la aplicación con los datos del archivo. Esta acción no se puede deshacer.',
      intent: 'danger',
      confirmLabel: 'Sí, importar',
    })

    if (!confirmed) {
      event.target.value = '' // Reset file input if user cancels
      return
    }

    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      importState(parsed)
      setLastRestore(new Date().toISOString())
      showToast({
        title: 'Éxito',
        message: 'Estado importado correctamente.',
        type: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido.'
      showToast({
        title: 'Error de Importación',
        message,
        type: 'error',
      })
    } finally {
      // Reset file input to allow re-uploading the same file
      event.target.value = ''
    }
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Nunca';
    try {
      return new Date(isoString).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    background: isActive ? 'white' : 'transparent',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 500,
    fontSize: '14px',
    color: isActive ? '#1F2937' : '#6b7280',
    borderBottom: isActive ? '2px solid #111827' : '2px solid transparent',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  })

  const settingItemStyle: React.CSSProperties = {
    padding: '16px 20px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontWeight: 500,
  }

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Navigation Tabs */}
      <div
        style={{
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '30px',
          display: 'flex',
        }}
      >
        <button
          style={tabStyle(activeSection === 'representatives')}
          onClick={() => setActiveSection('representatives')}
        >
          <Users size={16} />
          Representantes
        </button>
        <button
          style={tabStyle(activeSection === 'holidays')}
          onClick={() => setActiveSection('holidays')}
        >
          <Calendar size={16} />
          Feriados
        </button>
        <button
          style={tabStyle(activeSection === 'system')}
          onClick={() => setActiveSection('system')}
        >
          <Shield size={16} />
          Sistema
        </button>
      </div>

      {/* Content */}
      {activeSection === 'representatives' && <RepresentativeManagement />}
      {activeSection === 'holidays' && <HolidayManagement />}
      {activeSection === 'system' && (
        <div>
          <h2
            style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1F2937' }}
          >
            Configuración del Sistema
          </h2>
          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            Opciones avanzadas de administración y gestión del sistema.
          </p>

          {/* Modo Edición Avanzada */}
          <div style={settingItemStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    color: '#1F2937',
                  }}
                >
                  Modo Edición Avanzada
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#6b7280',
                  }}
                >
                  Permite modificar semanas pasadas. Usar con precaución.
                </p>
              </div>
              <button
                style={{
                  ...buttonStyle,
                  background:
                    mode === 'ADMIN_OVERRIDE' ? '#fefce8' : 'white',
                  color: mode === 'ADMIN_OVERRIDE' ? '#a16207' : '#374151',
                  borderColor:
                    mode === 'ADMIN_OVERRIDE' ? '#fde047' : '#d1d5db',
                }}
                onClick={toggle}
              >
                {mode === 'ADMIN_OVERRIDE' ? '✓ Activado' : 'Desactivado'}
              </button>
            </div>
          </div>

          {/* Importar/Exportar */}
          <div style={settingItemStyle}>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                color: '#1F2937',
              }}
            >
              Respaldo de Datos
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label
                style={{
                  ...buttonStyle,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={16} />
                Importar Respaldo
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                style={{
                  ...buttonStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={handleExport}
              >
                <Download size={16} />
                Exportar Respaldo
              </button>
            </div>
            {/* Historial de Respaldo */}
            <div style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <div>
                    <strong>Último respaldo:</strong> {formatDate(lastBackup)}
                </div>
                <div>
                    <strong>Última restauración:</strong> {formatDate(lastRestore)}
                </div>
            </div>
          </div>

          {/* Auditoría e Historial */}
          <div style={settingItemStyle}>
            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                color: '#1F2937',
              }}
            >
              Auditoría del Sistema
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
              Historial detallado de cambios y acciones administrativas.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  ...buttonStyle,
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
              >
                <History
                  size={16}
                  style={{
                    display: 'inline',
                    marginRight: '6px',
                    verticalAlign: 'middle',
                  }}
                />
                Historial
              </button>
              <button
                style={{
                  ...buttonStyle,
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
              >
                <FileCheck
                  size={16}
                  style={{
                    display: 'inline',
                    marginRight: '6px',
                    verticalAlign: 'middle',
                  }}
                />
                Auditoría
              </button>
            </div>
          </div>

          {/* Zona de Peligro */}
          <div
            style={{
              ...settingItemStyle,
              borderColor: '#fecaca',
              background: '#fef2f2',
            }}
          >
            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                color: '#991b1b',
              }}
            >
              Zona de Peligro
            </h3>
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: '13px',
                color: '#991b1b',
              }}
            >
              Estas acciones son irreversibles y pueden afectar datos
              importantes.
            </p>
            <button style={dangerButtonStyle} onClick={handleReset}>
              <RotateCcw
                size={16}
                style={{
                  display: 'inline',
                  marginRight: '6px',
                  verticalAlign: 'middle',
                }}
              />
              Resetear Planificación
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
