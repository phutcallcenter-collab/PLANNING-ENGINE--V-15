/**
 * 🎯 COVERAGE ABSENCE MODAL
 * 
 * Specialized modal for coverage-related absences.
 * Shows explicit responsibility resolution to prevent user confusion.
 * 
 * CRITICAL: This modal is ONLY shown when ResponsibilityResolution.kind === 'RESOLVED'
 * and source === 'COVERAGE'.
 */

'use client'

import React from 'react'
import type { ResponsibilityResolution } from '@/domain/planning/slotResponsibility'

// Define specific type for coverage resolution
type CoverageResolution = Extract<ResponsibilityResolution, { kind: 'RESOLVED' }> & { source: 'COVERAGE' }

interface CoverageAbsenceModalProps {
    resolution: CoverageResolution
    onConfirm: (justified: boolean) => void
    onCancel: () => void
}

export function CoverageAbsenceModal({
    resolution,
    onConfirm,
    onCancel
}: CoverageAbsenceModalProps) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ marginBottom: '20px' }}>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>⚠️</span>
                        {resolution.displayContext.title}
                    </h2>
                </div>

                {/* Body */}
                <div style={{ marginBottom: '24px' }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
                        {resolution.displayContext.subtitle}
                    </p>

                    <div
                        style={{
                            backgroundColor: '#fef3c7',
                            border: '1px solid #fbbf24',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px'
                        }}
                    >
                        <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
                            <strong>{resolution.displayContext.ownerName}</strong> no es responsable de esta ausencia.
                        </p>
                    </div>

                    <p style={{ margin: 0, fontSize: '15px', color: '#111827', fontWeight: 600 }}>
                        ¿Registrar ausencia para <strong>{resolution.displayContext.targetName}</strong>?
                    </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            backgroundColor: 'white',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={() => onConfirm(true)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#10b981',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Justificada
                    </button>

                    <button
                        onClick={() => onConfirm(false)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        No justificada
                    </button>
                </div>
            </div>
        </div>
    )
}
