'use client'

import React, { useState, useEffect } from 'react'
import { createAnalysisPeriod, getPreviousPeriod } from '@/domain/analysis/analysisPeriod'
import { useOperationalAnalysis } from '@/hooks/useOperationalAnalysis'
import {
    AnalysisPeriod,
    ComparisonMode,
    OperationalAnalysis,
} from '@/domain/analysis/analysisTypes'
import {
    TrendingUp,
    TrendingDown,
    Award,
    AlertTriangle,
} from 'lucide-react'

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const QUARTERS = [
    { value: 1, label: 'Ene–Mar' },
    { value: 2, label: 'Abr–Jun' },
    { value: 3, label: 'Jul–Sep' },
    { value: 4, label: 'Oct–Dic' },
]

// ============================================================================
// PERIOD SELECTOR
// ============================================================================

const PeriodSelector = ({
    label,
    value,
    onChange,
    lockKind,
}: {
    label: string
    value: { kind: 'MONTH' | 'QUARTER'; year: number; month?: number; quarter?: number }
    onChange: (value: { kind: 'MONTH' | 'QUARTER'; year: number; month?: number; quarter?: number }) => void
    lockKind?: boolean  // Deshabilita selector de kind
}) => {
    const currentYear = new Date().getFullYear()
    const years = [currentYear, currentYear - 1, currentYear - 2]

    return (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                {label}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
                <select
                    value={value.kind}
                    onChange={e => onChange({ ...value, kind: e.target.value as 'MONTH' | 'QUARTER' })}
                    disabled={lockKind}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '6px',
                        background: lockKind ? '#f3f4f6' : 'var(--bg-panel)',
                        cursor: lockKind ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: lockKind ? 0.6 : 1,
                    }}
                >
                    <option value="MONTH">Mes</option>
                    <option value="QUARTER">Trimestre</option>
                </select>

                {value.kind === 'MONTH' && (
                    <select
                        value={value.month ?? 0}
                        onChange={e => {
                            const month = Math.max(0, Math.min(11, Number(e.target.value)))
                            onChange({ ...value, month })
                        }}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '6px',
                            background: 'var(--bg-panel)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            flex: 1,
                        }}
                    >
                        {MONTHS.map((month, idx) => (
                            <option key={idx} value={idx}>
                                {month}
                            </option>
                        ))}
                    </select>
                )}

                {value.kind === 'QUARTER' && (
                    <select
                        value={value.quarter ?? 1}
                        onChange={e => onChange({ ...value, quarter: Number(e.target.value) as 1 | 2 | 3 | 4 })}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '6px',
                            background: 'var(--bg-panel)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            flex: 1,
                        }}
                    >
                        {QUARTERS.map(q => (
                            <option key={q.value} value={q.value}>
                                {q.label}
                            </option>
                        ))}
                    </select>
                )}

                <select
                    value={value.year}
                    onChange={e => onChange({ ...value, year: Number(e.target.value) })}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '6px',
                        background: 'var(--bg-panel)',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {years.map(year => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}

// ============================================================================
// ANALYSIS RESULTS
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

const AnalysisResults = ({ analysis }: { analysis: OperationalAnalysis }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* HEADER */}
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>
                    Análisis: {analysis.base.period.label}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
                    Comparado con: <strong>{analysis.compared.period.label}</strong>
                </p>
            </div>

            {/* COMPARISON TABLE */}
            <div
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                }}
            >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px' }}>
                                Indicador
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>
                                Base
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>
                                Comparado
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>
                                Δ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { label: 'Incidencias', key: 'incidents' as const, inverse: true },
                            { label: 'Puntos', key: 'points' as const, inverse: true },
                            { label: 'Ausencias', key: 'absences' as const, inverse: true },
                            { label: 'Licencias', key: 'licenses' as const, inverse: true },
                        ].map((row, idx) => (
                            <tr
                                key={row.key}
                                style={{
                                    borderTop: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                }}
                            >
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.label}</td>
                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                                    {analysis.base.metrics[row.key]}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {analysis.compared.metrics[row.key]}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <DeltaBadge value={analysis.compared.delta[row.key]} inverse={row.inverse} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* SHIFT COMPARISON */}
            <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>
                    Comparación por Turnos
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {analysis.shifts.map(shift => (
                        <div
                            key={shift.shift}
                            style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '16px',
                            }}
                        >
                            <h5 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>
                                Turno {shift.shift === 'DAY' ? 'Día' : 'Noche'}
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span>Incidencias:</span>
                                    <span>
                                        <strong>{shift.base.incidents}</strong> vs {shift.compared.incidents}
                                        <span style={{ marginLeft: '8px' }}>
                                            <DeltaBadge value={shift.delta.incidents} inverse />
                                        </span>
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span>Puntos:</span>
                                    <span>
                                        <strong>{shift.base.points}</strong> vs {shift.compared.points}
                                        <span style={{ marginLeft: '8px' }}>
                                            <DeltaBadge value={shift.delta.points} inverse />
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RISK */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div
                    style={{
                        border: '1px solid #fee2e2',
                        borderRadius: '8px',
                        padding: '16px',
                        background: '#fef2f2',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <AlertTriangle size={18} color="#b91c1c" />
                        <h5 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                            Mayor Riesgo ({analysis.risk.needsAttention.length})
                        </h5>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.risk.needsAttention.slice(0, 5).map(rep => (
                            <div
                                key={rep.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '13px',
                                }}
                            >
                                <span>{rep.name}</span>
                                <span style={{ fontWeight: 700, color: '#b91c1c' }}>{rep.points} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        border: '1px solid #d1fae5',
                        borderRadius: '8px',
                        padding: '16px',
                        background: '#f0fdf4',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Award size={18} color="#059669" />
                        <h5 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                            Mejor Desempeño ({analysis.risk.topPerformers.length})
                        </h5>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.risk.topPerformers.slice(0, 5).map(rep => (
                            <div key={rep.id} style={{ fontSize: '13px' }}>
                                {rep.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* READING */}
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
                <strong>Lectura:</strong> {analysis.reading}
            </div>
        </div>
    )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OperationalAnalysisView() {
    const currentDate = new Date()
    const [basePeriod, setBasePeriod] = useState<{
        kind: 'MONTH' | 'QUARTER'
        year: number
        month?: number
        quarter?: number
    }>({
        kind: 'MONTH',
        year: currentDate.getFullYear(),
        month: currentDate.getMonth(),
    })

    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('PREVIOUS')
    const [customPeriod, setCustomPeriod] = useState<{
        kind: 'MONTH' | 'QUARTER'
        year: number
        month?: number
        quarter?: number
    }>({
        kind: 'MONTH',
        year: currentDate.getFullYear(),
        month: Math.max(0, currentDate.getMonth() - 1),  // Normalizado
    })

    // Auto-calcular customPeriod válido al activar CUSTOM
    useEffect(() => {
        if (comparisonMode === 'CUSTOM') {
            try {
                const base = createAnalysisPeriod(
                    basePeriod.kind === 'MONTH'
                        ? { kind: 'MONTH', year: basePeriod.year, month: basePeriod.month! }
                        : { kind: 'QUARTER', year: basePeriod.year, quarter: basePeriod.quarter! as 1 | 2 | 3 | 4 }
                )
                const prev = getPreviousPeriod(base)

                setCustomPeriod({
                    kind: prev.kind,
                    year: prev.year,
                    month: prev.kind === 'MONTH' ? new Date(prev.from).getMonth() : undefined,
                    quarter: prev.kind === 'QUARTER' ? (Math.floor(new Date(prev.from).getMonth() / 3) + 1) as 1 | 2 | 3 | 4 : undefined,
                })
            } catch (error) {
                console.error('Error auto-calculating custom period:', error)
            }
        }
    }, [comparisonMode, basePeriod.kind])

    const [analysisParams, setAnalysisParams] = useState<{
        base: AnalysisPeriod
        mode: ComparisonMode
        compared?: AnalysisPeriod
    } | null>(null)

    const [analysisError, setAnalysisError] = useState<string | null>(null)

    // Track last executed params to detect changes
    const [lastExecutedParams, setLastExecutedParams] = useState<string | null>(null)

    // Check if current selection differs from last execution
    const hasChanged = (() => {
        try {
            const base = createAnalysisPeriod(
                basePeriod.kind === 'MONTH'
                    ? { kind: 'MONTH', year: basePeriod.year, month: basePeriod.month! }
                    : { kind: 'QUARTER', year: basePeriod.year, quarter: basePeriod.quarter! as 1 | 2 | 3 | 4 }
            )
            const params =
                comparisonMode === 'CUSTOM'
                    ? {
                        base,
                        mode: comparisonMode,
                        compared: createAnalysisPeriod(
                            customPeriod.kind === 'MONTH'
                                ? { kind: 'MONTH', year: customPeriod.year, month: customPeriod.month! }
                                : { kind: 'QUARTER', year: customPeriod.year, quarter: customPeriod.quarter! as 1 | 2 | 3 | 4 }
                        ),
                    }
                    : { base, mode: comparisonMode }
            return JSON.stringify(params) !== lastExecutedParams
        } catch {
            return true
        }
    })()

    // ALWAYS call the hook - never conditionally
    // Hook now accepts null and returns null in that case
    const analysis = useOperationalAnalysis(analysisParams)

    const handleExecuteAnalysis = () => {
        try {
            setAnalysisError(null)

            const base = createAnalysisPeriod(
                basePeriod.kind === 'MONTH'
                    ? { kind: 'MONTH', year: basePeriod.year, month: basePeriod.month! }
                    : { kind: 'QUARTER', year: basePeriod.year, quarter: basePeriod.quarter! as 1 | 2 | 3 | 4 }
            )

            const params =
                comparisonMode === 'CUSTOM'
                    ? {
                        base,
                        mode: comparisonMode,
                        compared: createAnalysisPeriod(
                            customPeriod.kind === 'MONTH'
                                ? { kind: 'MONTH', year: customPeriod.year, month: customPeriod.month! }
                                : { kind: 'QUARTER', year: customPeriod.year, quarter: customPeriod.quarter! as 1 | 2 | 3 | 4 }
                        ),
                    }
                    : { base, mode: comparisonMode }

            const paramsKey = JSON.stringify(params)
            setLastExecutedParams(paramsKey)
            setAnalysisParams(params)
        } catch (error) {
            console.error('Error executing analysis:', error)
            setAnalysisError(error instanceof Error ? error.message : 'Error creating periods')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px' }}>
                    Análisis de Períodos
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
                    Este modo permite investigar períodos específicos sin afectar el reporte institucional.
                </p>
            </div>

            {/* SELECTORS */}
            <div
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '24px',
                    background: 'var(--bg-panel)',
                }}
            >
                <PeriodSelector
                    label="Período base:"
                    value={basePeriod}
                    onChange={setBasePeriod}
                />

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                        Comparar con:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="PREVIOUS"
                                checked={comparisonMode === 'PREVIOUS'}
                                onChange={() => setComparisonMode('PREVIOUS')}
                            />
                            <span style={{ fontSize: '14px' }}>Período anterior</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="YEAR_AGO"
                                checked={comparisonMode === 'YEAR_AGO'}
                                onChange={() => setComparisonMode('YEAR_AGO')}
                            />
                            <span style={{ fontSize: '14px' }}>Mismo período año anterior</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="CUSTOM"
                                checked={comparisonMode === 'CUSTOM'}
                                onChange={() => setComparisonMode('CUSTOM')}
                            />
                            <span style={{ fontSize: '14px' }}>Otro período</span>
                        </label>
                    </div>
                </div>

                {comparisonMode === 'CUSTOM' && (
                    <PeriodSelector
                        label="Período a comparar:"
                        value={{ ...customPeriod, kind: basePeriod.kind }}
                        onChange={v => setCustomPeriod({ ...v, kind: basePeriod.kind })}
                        lockKind={true}
                    />
                )}

                <button
                    onClick={handleExecuteAnalysis}
                    disabled={!hasChanged && analysisParams !== null}
                    style={{
                        padding: '10px 20px',
                        background: (!hasChanged && analysisParams !== null) ? '#9ca3af' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (!hasChanged && analysisParams !== null) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        marginTop: '16px',
                        opacity: (!hasChanged && analysisParams !== null) ? 0.6 : 1,
                    }}
                >
                    {!hasChanged && analysisParams !== null ? 'Análisis actualizado' : 'Ejecutar análisis'}
                </button>
            </div>

            {/* RESULTS */}
            {!analysis ? (
                <div
                    style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                    }}
                >
                    <p style={{ margin: 0, fontSize: '14px' }}>
                        Selecciona un período base y un modo de comparación, luego haz clic en
                        <strong> "Ejecutar análisis"</strong> para ver los resultados.
                    </p>
                </div>
            ) : (
                <AnalysisResults analysis={analysis} />
            )}
        </div>
    )
}
