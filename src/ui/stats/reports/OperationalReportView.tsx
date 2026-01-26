'use client'

import React, { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
    TrendingUp,
    TrendingDown,
    Award,
    AlertTriangle,
    FileText,
} from 'lucide-react'
import { selectOperationalReport } from '@/store/selectors/selectOperationalReport'
import {
    OperationalReport,
    RepresentativeRisk,
} from '@/domain/reports/operationalTypes'
import OperationalAnalysisView from './OperationalAnalysisView'
import { exportOperationalReport } from './exportOperationalReport'

type ComparisonMode = 'PREVIOUS' | 'YEAR_AGO'

const PERIOD_OPTIONS = [
    { label: 'Mes Actual', value: 'MONTH' as const },
    { label: 'Trimestre Actual', value: 'QUARTER' as const },
]

// ============================================================================
// HEADER
// ============================================================================

const ReportHeader = ({
    onPeriodChange,
    currentPeriodLabel,
    onExport,
}: {
    onPeriodChange: (kind: 'MONTH' | 'QUARTER') => void
    currentPeriodLabel: string
    onExport: () => void
}) => (
    <div
        style={{
            paddingBottom: '16px',
            borderBottom: '1px solid #e5e7eb',
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
                    Reporte Operativo
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Evaluación del período <strong>{currentPeriodLabel}</strong>
                </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                    onClick={onExport}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500
                    }}
                    title="Descargar PDF para Jefatura"
                >
                    <FileText size={16} />
                    Exportar PDF
                </button>
                <select
                    onChange={e => onPeriodChange(e.target.value as 'MONTH' | 'QUARTER')}
                    defaultValue="MONTH"
                    style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '6px',
                        background: 'var(--bg-panel)',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {PERIOD_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    </div>
)

// ============================================================================
// COMPARISON TABLE
// ============================================================================

const DeltaBadge = ({ value, inverse }: { value: number; inverse?: boolean }) => {
    const isNegative = inverse ? value > 0 : value < 0
    const color = isNegative ? '#059669' : '#b91c1c'
    const Icon = isNegative ? TrendingDown : TrendingUp

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color }}>
            <Icon size={16} />
            <span style={{ fontWeight: 700 }}>
                {value > 0 ? '+' : ''}
                {value}
            </span>
        </div>
    )
}

const ComparisonTable = ({ comparison, currentMetrics }: {
    comparison: OperationalReport['comparison']
    currentMetrics: OperationalReport['current']['metrics']
}) => {
    const [compareMode, setCompareMode] = useState<ComparisonMode>('PREVIOUS')

    const rows = [
        { label: 'Incidencias', key: 'incidents' as const, inverse: true },
        { label: 'Puntos', key: 'points' as const, inverse: true },
        { label: 'Ausencias', key: 'absences' as const, inverse: true },
        { label: 'Licencias', key: 'licenses' as const, inverse: true },
    ]

    const selectedComparison = compareMode === 'PREVIOUS' ? comparison.previous : comparison.yearAgo

    return (
        <div
            style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                background: 'var(--bg-panel)',
                overflow: 'hidden',
            }}
        >
            {/* Period comparison header */}
            <div
                style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#f9fafb',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        Comparación Operativa
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setCompareMode('PREVIOUS')}
                            style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                border: '1px solid var(--border-strong)',
                                borderRadius: '4px',
                                background: compareMode === 'PREVIOUS' ? 'var(--text-main)' : 'transparent',
                                color: compareMode === 'PREVIOUS' ? 'white' : 'var(--text-main)',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            vs Período Anterior
                        </button>
                        <button
                            onClick={() => setCompareMode('YEAR_AGO')}
                            style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                border: '1px solid var(--border-strong)',
                                borderRadius: '4px',
                                background: compareMode === 'YEAR_AGO' ? 'var(--text-main)' : 'transparent',
                                color: compareMode === 'YEAR_AGO' ? 'white' : 'var(--text-main)',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            vs Año Anterior
                        </button>
                    </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong>Comparado con:</strong> {selectedComparison.period.label}
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>
                            Indicador
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                            Actual
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                            Comparado
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                            Δ
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{row.label}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '16px', fontWeight: 700 }}>
                                {currentMetrics[row.key]}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {selectedComparison.metrics[row.key]}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <DeltaBadge value={selectedComparison.delta[row.key]} inverse={row.inverse} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ============================================================================
// PEOPLE LISTS
// ============================================================================

const PersonList = ({
    title,
    data,
    icon: Icon,
    variant,
}: {
    title: string
    data: RepresentativeRisk[]
    icon: React.ElementType
    variant: 'success' | 'danger'
}) => {
    const cellStyle: React.CSSProperties = {
        padding: '8px 12px',
        fontSize: '14px',
        borderTop: '1px solid #f3f4f6',
    }

    return (
        <div
            style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                background: 'var(--bg-panel)',
                height: '100%',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    color: variant === 'success' ? '#059669' : '#b91c1c',
                }}
            >
                <Icon size={20} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    {title} ({data.length})
                </h3>
            </header>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {data.map(rep => (
                            <tr key={rep.id}>
                                <td style={{ ...cellStyle, fontWeight: 500 }}>{rep.name}</td>
                                <td
                                    style={{
                                        ...cellStyle,
                                        textAlign: 'right',
                                        fontWeight: 700,
                                        color: variant === 'danger' && rep.points > 0 ? '#b91c1c' : '#374151',
                                    }}
                                >
                                    {rep.points > 0 ? `${rep.points} pts` : ''}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={2}
                                    style={{
                                        ...cellStyle,
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    No hay representantes en esta categoría.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ============================================================================
// MAIN VIEW
// ============================================================================

export function OperationalReportView() {
    const [mode, setMode] = useState<'INSTITUTIONAL' | 'ANALYSIS'>('INSTITUTIONAL')
    const [periodKind, setPeriodKind] = useState<'MONTH' | 'QUARTER'>('MONTH')

    const report = useAppStore(state => selectOperationalReport(state, periodKind))

    if (!report) {
        return <div style={{ padding: 24 }}>Cargando reporte...</div>
    }

    return (
        <div
            style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
            }}
        >
            {/* MODE TOGGLE */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '4px',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    width: 'fit-content',
                }}
            >
                <button
                    onClick={() => setMode('INSTITUTIONAL')}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background: mode === 'INSTITUTIONAL' ? 'white' : 'transparent',
                        color: mode === 'INSTITUTIONAL' ? '#1f2937' : '#6b7280',
                        fontWeight: mode === 'INSTITUTIONAL' ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: '14px',
                        boxShadow: mode === 'INSTITUTIONAL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                >
                    ● Reporte Operativo
                </button>
                <button
                    onClick={() => setMode('ANALYSIS')}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background: mode === 'ANALYSIS' ? 'white' : 'transparent',
                        color: mode === 'ANALYSIS' ? '#1f2937' : '#6b7280',
                        fontWeight: mode === 'ANALYSIS' ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: '14px',
                        boxShadow: mode === 'ANALYSIS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                >
                    ○ Análisis de Períodos
                </button>
            </div>

            {/* RENDER BASED ON MODE */}
            {mode === 'INSTITUTIONAL' ? (
                <>
                    <ReportHeader
                        onPeriodChange={setPeriodKind}
                        currentPeriodLabel={report.current.period.label}
                        onExport={() => exportOperationalReport(report)}
                    />

                    {/* COMPARACIÓN */}
                    <div>
                        <ComparisonTable
                            comparison={report.comparison}
                            currentMetrics={report.current.metrics}
                        />
                    </div>

                    {/* PERSONAS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <PersonList
                            title="Mayor Riesgo Operativo"
                            data={report.risk.needsAttention}
                            icon={AlertTriangle}
                            variant="danger"
                        />
                        <PersonList
                            title="Mejor Desempeño del Período"
                            data={report.risk.topPerformers}
                            icon={Award}
                            variant="success"
                        />
                    </div>

                    {/* Lectura Gerencial */}
                    <div
                        style={{
                            padding: '16px',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontStyle: 'italic',
                            color: '#374151',
                        }}
                    >
                        <strong>Lectura:</strong> {report.reading}
                    </div>
                </>
            ) : (
                <OperationalAnalysisView />
            )}
        </div>
    )
}
