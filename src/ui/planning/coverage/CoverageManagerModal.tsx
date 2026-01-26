import React from 'react'
import { createPortal } from 'react-dom'
import {
    X,
    Trash2,
    Shield,
    RefreshCw,
    Calendar,
    AlertCircle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCoverageStore } from '@/store/useCoverageStore'
import { useAppStore } from '@/store/useAppStore'
import { ISODate } from '@/domain/types'

interface CoverageManagerModalProps {
    isOpen: boolean
    onClose: () => void
    date: ISODate
}

export function CoverageManagerModal({ isOpen, onClose, date }: CoverageManagerModalProps) {
    const { representatives } = useAppStore(s => ({ representatives: s.representatives }))
    const coverages = useCoverageStore(s => s.coverages)
    const cancelCoverage = useCoverageStore(s => s.cancelCoverage)

    // Memoize active coverages for this day (pure derivation - no function dependencies)
    const dailyCoverages = React.useMemo(() => {
        return coverages.filter(
            c => c.status === 'ACTIVE' && c.date === date
        )
    }, [coverages, date])



    // Format date for header
    const formattedDate = React.useMemo(() => {
        try {
            return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })
        } catch (e) {
            return date
        }
    }, [date])

    const handleCancel = async (id: string, repName: string) => {
        const { showConfirm } = useAppStore.getState()

        // Close coverage modal to show confirmation cleanly
        onClose()

        const ok = await showConfirm({
            title: 'Cancelar cobertura',
            description: `¿Seguro que deseas cancelar la cobertura de ${repName}?`,
            intent: 'danger',
            confirmLabel: 'Cancelar cobertura',
        })

        if (ok) {
            // User confirmed - cancel the coverage
            cancelCoverage(id)
        }
        // Note: Modal stays closed regardless of confirmation result
        // User can reopen it manually if they want to see remaining coverages
    }

    if (!isOpen) return null

    // Helper to find rep name
    const getRepName = (id: string) => representatives.find(r => r.id === id)?.name || 'Desconocido'

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
            }}
            onClick={onClose}
        >

            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    width: '500px',
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                            Gestión de Coberturas
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#6b7280', fontSize: '14px' }}>
                            <Calendar size={14} />
                            <span style={{ textTransform: 'capitalize' }}>{formattedDate}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dailyCoverages.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '50%' }}>
                                <Shield size={32} color="#9ca3af" />
                            </div>
                            <p>No hay coberturas activas para este día.</p>
                        </div>
                    ) : (
                        dailyCoverages.map(coverage => (
                            <div
                                key={coverage.id}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#f9fafb'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* Relation Card */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Covered Person */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Shield size={12} />
                                                {getRepName(coverage.coveredRepId)}
                                            </div>
                                        </div>

                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>es cubierto por</span>

                                        {/* Covering Person */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ background: '#f3e8ff', color: '#6b21a8', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <RefreshCw size={12} />
                                                {getRepName(coverage.coveringRepId)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 500 }}>
                                            Turno: {coverage.shift === 'DAY' ? 'Día' : 'Noche'}
                                        </span>
                                        {coverage.note && (
                                            <span style={{ fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                "{coverage.note}"
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={() => handleCancel(coverage.id, getRepName(coverage.coveredRepId))}
                                    title="Cancelar cobertura"
                                    style={{
                                        background: 'white',
                                        border: '1px solid #fee2e2',
                                        color: '#ef4444',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
