'use client'

import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ShiftType } from '@/domain/types'

const DAYS = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
] as const

const SHIFTS: ShiftType[] = ['DAY', 'NIGHT']

export function CoverageRulesMatrix() {
    const { coverageRules, addOrUpdateCoverageRule, removeCoverageRule } = useAppStore(s => ({
        coverageRules: s.coverageRules,
        addOrUpdateCoverageRule: s.addOrUpdateCoverageRule,
        removeCoverageRule: s.removeCoverageRule
    }))

    const getRule = (day: number, shift: ShiftType) => {
        return coverageRules.find(
            r =>
                r.scope.type === 'WEEKDAY' &&
                r.scope.day === day &&
                r.scope.shift === shift
        )
    }

    const getInheritedValue = (day: number, shift: ShiftType): number => {
        // 1. Generic Weekday (e.g. Any Sunday)
        const weekdayMatch = coverageRules.find(
            r =>
                r.scope.type === 'WEEKDAY' &&
                r.scope.day === day &&
                !r.scope.shift
        )
        if (weekdayMatch) return weekdayMatch.required

        // 2. Generic Shift (e.g. Any Night)
        const shiftMatch = coverageRules.find(
            r => r.scope.type === 'SHIFT' && r.scope.shift === shift
        )
        if (shiftMatch) return shiftMatch.required

        // 3. Global
        const globalMatch = coverageRules.find(r => r.scope.type === 'GLOBAL')
        if (globalMatch) return globalMatch.required

        return 0 // Default fallback
    }

    const handleChange = (day: number, shift: ShiftType, value: string) => {
        const numValue = parseInt(value, 10)
        const existingRule = getRule(day, shift)

        if (isNaN(numValue)) {
            if (existingRule) {
                removeCoverageRule(existingRule.id)
            }
            return
        }

        const dayLabel = DAYS.find(d => d.value === day)?.label || ''
        const shiftLabel = shift === 'DAY' ? 'Día' : 'Noche'

        addOrUpdateCoverageRule({
            id: existingRule?.id || `wk-${day}-${shift}-${crypto.randomUUID().slice(0, 4)}`,
            required: numValue,
            scope: { type: 'WEEKDAY', day: day as any, shift },
            label: `Demanda: ${dayLabel} · Turno ${shiftLabel}`
        })
    }

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#111827' }}>
                Demanda Operativa Semanal
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
                Define la cantidad mínima aceptable de personal por día y turno.
                <br />
                Si no se define un valor específico, el sistema usará la demanda heredada.
            </p>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 600, fontSize: '14px' }}>
                                Día
                            </th>
                            {SHIFTS.map(shift => (
                                <th key={shift} style={{ textAlign: 'center', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 600, fontSize: '14px' }}>
                                    Turno {shift === 'DAY' ? 'Día' : 'Noche'}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day) => (
                            <tr key={day.value} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontWeight: 500, color: '#111827' }}>
                                    {day.label}
                                </td>
                                {SHIFTS.map(shift => {
                                    const rule = getRule(day.value, shift)
                                    const inherited = getInheritedValue(day.value, shift)
                                    const isExplicit = !!rule

                                    return (
                                        <td key={shift} style={{ padding: '8px', textAlign: 'center' }}>
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={rule?.required ?? ''}
                                                    placeholder={inherited.toString()}
                                                    onChange={(e) => handleChange(day.value, shift, e.target.value)}
                                                    style={{
                                                        width: '80px',
                                                        textAlign: 'center',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: `1px solid ${isExplicit ? '#2563eb' : '#d1d5db'}`,
                                                        background: isExplicit ? '#eff6ff' : '#f9fafb',
                                                        fontWeight: isExplicit ? 600 : 400,
                                                        color: isExplicit ? '#1e40af' : '#6b7280',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        transition: 'all 0.2s'
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: '#f9fafb', borderRadius: '8px', display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#eff6ff', border: '1px solid #2563eb', borderRadius: '3px' }}></div>
                    <span>Regla Explícita</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '3px' }}></div>
                    <span>Heredado (Estándar)</span>
                </div>
            </div>
        </div>
    )
}
