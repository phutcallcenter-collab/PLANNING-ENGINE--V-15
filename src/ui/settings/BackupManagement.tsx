'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
    exportBackup,
    importBackup,
    getBackupHistory,
    saveBackupToLocalStorage,
    loadBackupFromLocalStorage,
    deleteBackupFromLocalStorage,
    getAutoBackupMetadata
} from '@/persistence/backup'
import { Download, Upload, Trash2, Save, AlertCircle } from 'lucide-react'

export function BackupManagement() {
    const { representatives, incidents, calendar, coverageRules, swaps, specialSchedules, historyEvents, auditLog, managers, managementSchedules, version, importState } = useAppStore()
    const [backups, setBackups] = useState<Array<{ key: string; timestamp: string; size: number }>>([])
    const [autoBackup, setAutoBackup] = useState<{ timestamp: string; size: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        refreshBackupList()
    }, [])

    const refreshBackupList = () => {
        setBackups(getBackupHistory())
        const auto = getAutoBackupMetadata()
        if (auto) {
            setAutoBackup(auto)
        }
    }

    const handleExport = () => {
        try {
            const state = {
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
            exportBackup(state)
            setSuccess('Backup exportado exitosamente')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            setError('Error al exportar backup: ' + (err as Error).message)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const state = await importBackup(file)

            if (confirm('¿Estás seguro de que deseas restaurar este backup? Esto reemplazará todos los datos actuales.')) {
                // Restore state - add required metadata
                const payload = {
                    ...state,
                    managers: state.managers || [],
                    managementSchedules: state.managementSchedules || {},
                    exportedAt: new Date().toISOString(),
                    appVersion: 1,
                }
                await importState(payload)
                setSuccess('Backup restaurado exitosamente')
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err) {
            setError('Error al importar backup: ' + (err as Error).message)
        }

        // Reset input
        e.target.value = ''
    }

    const handleSaveBackup = () => {
        try {
            const state = {
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
            saveBackupToLocalStorage(state)
            refreshBackupList()
            setSuccess('Backup guardado en el navegador')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            setError('Error al guardar backup: ' + (err as Error).message)
        }
    }

    const handleRestoreBackup = (key: string) => {
        if (!confirm('¿Estás seguro de que deseas restaurar este backup?')) return

        try {
            const state = loadBackupFromLocalStorage(key)
            if (!state) {
                setError('No se pudo cargar el backup')
                return
            }

            // Add required metadata
            const payload = {
                ...state,
                managers: state.managers || [],
                managementSchedules: state.managementSchedules || {},
                exportedAt: new Date().toISOString(),
                appVersion: 1,
            }
            importState(payload)
            setSuccess('Backup restaurado exitosamente')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            setError('Error al restaurar backup: ' + (err as Error).message)
        }
    }

    const handleDeleteBackup = (key: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este backup?')) return

        try {
            deleteBackupFromLocalStorage(key)
            refreshBackupList()
            setSuccess('Backup eliminado')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            setError('Error al eliminar backup: ' + (err as Error).message)
        }
    }

    const formatDate = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return timestamp
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Gestión de Backups
                {autoBackup && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></div>
                            Auto-Backup: {formatDate(autoBackup.timestamp)}
                        </span>
                        <button
                            onClick={() => handleRestoreBackup('planning-backup-auto-latest')}
                            style={{
                                fontSize: '12px',
                                background: 'transparent',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}
                            title="Restaurar copia de seguridad automática"
                        >
                            Restaurar
                        </button>
                    </div>
                )}
            </h2>


            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-danger)',
                    border: '1px solid var(--border-danger)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-danger)',
                }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    padding: '12px 16px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    color: '#166534',
                }}>
                    {success}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '32px',
            }}>
                <button
                    onClick={handleExport}
                    style={{
                        padding: '12px 16px',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <Download size={18} />
                    Exportar Backup
                </button>

                <label style={{
                    padding: '12px 16px',
                    background: 'var(--bg-panel)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}>
                    <Upload size={18} />
                    Importar Backup
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        style={{ display: 'none' }}
                    />
                </label>

                <button
                    onClick={handleSaveBackup}
                    style={{
                        padding: '12px 16px',
                        background: 'var(--bg-panel)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <Save size={18} />
                    Guardar Backup Local
                </button>
            </div>

            <div>
                <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>
                    Backups Guardados ({backups.length})
                </h3>

                {backups.length === 0 ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-muted)',
                        borderRadius: '8px',
                    }}>
                        No hay backups guardados en el navegador
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {backups.map(backup => (
                            <div
                                key={backup.key}
                                style={{
                                    padding: '16px',
                                    background: 'var(--bg-panel)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {formatDate(backup.timestamp)}
                                        {backup.key.includes('-auto-') && (
                                            <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                AUTO
                                            </span>
                                        )}
                                        {backup.key.includes('-manual-') && (
                                            <span style={{ fontSize: '10px', background: '#f3f4f6', color: '#374151', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                MANUAL
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        Tamaño: {formatSize(backup.size)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleRestoreBackup(backup.key)}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'var(--accent)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                        }}
                                    >
                                        Restaurar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBackup(backup.key)}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'transparent',
                                            color: 'var(--text-danger)',
                                            border: '1px solid var(--border-danger)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
