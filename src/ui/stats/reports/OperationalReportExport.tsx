import React from 'react'
import { OperationalReport } from '@/domain/reports/operationalTypes'

export function OperationalReportExport({ report }: { report: OperationalReport }) {
    const { current, comparison } = report

    // Helper helper for formatting numbers
    const fmt = (n: number) => n.toLocaleString('es-CL')

    return (
        <div style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#1f2937', // gray-800
            lineHeight: 1.5,
            width: '520pt', // A4 printable width approx
            padding: '20px'
        }}>
            {/* HEADERS */}
            <div style={{ marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                <h1 style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: '0 0 4px 0',
                    color: '#111827'
                }}>
                    Reporte Operativo Gerencial
                </h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                    <span>
                        Período: <strong>{current.period.label}</strong>
                    </span>
                    <span>
                        Comparación: <strong>{comparison.previous.period.label}</strong>
                    </span>
                </div>
            </div>

            {/* METRICS TABLE */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '14px', marginBottom: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Resumen de Indicadores
                </h2>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '8px'
                }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #9ca3af' }}>
                            <th align="left" style={{ padding: '8px 4px', fontWeight: 600 }}>Indicador</th>
                            <th align="right" style={{ padding: '8px 4px', fontWeight: 600 }}>Actual</th>
                            <th align="right" style={{ padding: '8px 4px', fontWeight: 600 }}>Anterior</th>
                            <th align="right" style={{ padding: '8px 4px', fontWeight: 600 }}>Variación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { label: 'Incidencias Totales', key: 'incidents' as const },
                            { label: 'Puntos de Penalización', key: 'points' as const },
                            { label: 'Ausencias Totales', key: 'absences' as const },
                            { label: 'Licencias Médicas', key: 'licenses' as const },
                        ].map((row, idx) => {
                            const currentVal = current.metrics[row.key]
                            const prevVal = comparison.previous.metrics[row.key]
                            const delta = comparison.previous.delta[row.key]
                            const isPositive = delta > 0
                            const sign = isPositive ? '+' : ''

                            return (
                                <tr key={row.key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '8px 4px' }}>{row.label}</td>
                                    <td align="right" style={{ padding: '8px 4px', fontWeight: 600 }}>{fmt(currentVal)}</td>
                                    <td align="right" style={{ padding: '8px 4px', color: '#6b7280' }}>{fmt(prevVal)}</td>
                                    <td align="right" style={{ padding: '8px 4px' }}>
                                        {delta !== 0 && (
                                            <span style={{
                                                // Simplified static coloring for PDF
                                                color: '#374151',
                                                fontWeight: 600
                                            }}>
                                                {sign}{delta}
                                            </span>
                                        )}
                                        {delta === 0 && <span style={{ color: '#9ca3af' }}>-</span>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* MANAGERIAL READING */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '14px', marginBottom: '8px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Lectura Gerencial
                </h2>
                <div style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    textAlign: 'justify'
                }}>
                    {report.reading}
                </div>
            </div>

            {/* RISKS SECTION (Simplified) */}
            {report.risk.needsAttention.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '14px', marginBottom: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Foco de Atención (Top Riesgos)
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #9ca3af', fontSize: '10px' }}>
                                <th align="left" style={{ padding: '4px' }}>Agente</th>
                                <th align="right" style={{ padding: '4px' }}>Puntos de Penalización</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.risk.needsAttention.slice(0, 5).map(risk => (
                                <tr key={risk.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '4px' }}>{risk.name}</td>
                                    <td align="right" style={{ padding: '4px', fontWeight: 600 }}>{risk.points} pts</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* FOOTER */}
            <div style={{
                marginTop: '40px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                fontSize: '9px',
                color: '#9ca3af',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Generado automáticamente por Planning Engine</span>
                <span>{new Date().toLocaleDateString('es-CL')}</span>
            </div>
        </div>
    )
}
