'use client'

import React, { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ShiftType, WeeklyPattern, DailyDuty } from '@/domain/types'
import { Calendar, AlertCircle, Check, X } from 'lucide-react'
import { format, addDays, startOfWeek, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface MixedShiftManagerProps {
    repId: string
    repName: string
    onClose: () => void
}

export function MixedShiftManager({ repId, repName, onClose }: MixedShiftManagerProps) {
    const { representatives, addEffectivePeriod } = useAppStore()
    const representative = representatives.find(r => r.id === repId)

    if (!representative) {
        return null
    }

    // Get current mixed days from mixProfile
    const baseMixedDays = representative.mixProfile?.type === 'WEEKDAY'
        ? [1, 2, 3, 4] // Mon-Thu
        : representative.mixProfile?.type === 'WEEKEND'
            ? [5, 6, 0] // Fri-Sun
            : []



    // State now tracks the STATUS of each day: 'BASE' | 'MIXED' | 'OFF'
    // Initialize with MIXED for days in baseMixedDays, BASE for others
    const initialDayStates = Array(7).fill('BASE').map((_, i) =>
        baseMixedDays.includes(i) ? 'MIXED' : 'BASE'
    )

    // Using a map or array of states
    const [dayStates, setDayStates] = useState<('BASE' | 'MIXED' | 'OFF')[]>(initialDayStates)
    const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { locale: es }), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(addDays(new Date(), 90), 'yyyy-MM-dd'))
    const [note, setNote] = useState('')

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const dayAbbrev = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

    const toggleDay = (dayIndex: number) => {
        setDayStates(prev => {
            const current = prev[dayIndex]
            let next: 'BASE' | 'MIXED' | 'OFF' = 'BASE'

            // Cycle: BASE -> MIXED -> OFF -> BASE
            if (current === 'BASE') next = 'MIXED'
            else if (current === 'MIXED') next = 'OFF'
            else if (current === 'OFF') next = 'BASE'

            const newStates = [...prev]
            newStates[dayIndex] = next
            return newStates
        })
    }

    const handleSave = () => {
        // ===============================================
        // ATOMIC PERIOD GENERATION
        // ===============================================
        // This generates ONE EffectivePeriod that REPLACES everything.
        // No accumulation. No inheritance. Pure replacement.

        // Helper: Determine base duty for a day when NOT mixed
        const baseDutyForDay = (day: number): DailyDuty => {
            if (representative.baseShift === 'DAY') return 'DAY'
            if (representative.baseShift === 'NIGHT') return 'NIGHT'
            // Fallback (should not happen for mixed reps)
            return 'OFF'
        }

        // Build the complete weekly pattern
        // Build the complete weekly pattern
        const weeklyPattern: WeeklyPattern = {
            0: dayStates[0] === 'MIXED' ? 'BOTH' : (dayStates[0] === 'OFF' ? 'OFF' : baseDutyForDay(0)),
            1: dayStates[1] === 'MIXED' ? 'BOTH' : (dayStates[1] === 'OFF' ? 'OFF' : baseDutyForDay(1)),
            2: dayStates[2] === 'MIXED' ? 'BOTH' : (dayStates[2] === 'OFF' ? 'OFF' : baseDutyForDay(2)),
            3: dayStates[3] === 'MIXED' ? 'BOTH' : (dayStates[3] === 'OFF' ? 'OFF' : baseDutyForDay(3)),
            4: dayStates[4] === 'MIXED' ? 'BOTH' : (dayStates[4] === 'OFF' ? 'OFF' : baseDutyForDay(4)),
            5: dayStates[5] === 'MIXED' ? 'BOTH' : (dayStates[5] === 'OFF' ? 'OFF' : baseDutyForDay(5)),
            6: dayStates[6] === 'MIXED' ? 'BOTH' : (dayStates[6] === 'OFF' ? 'OFF' : baseDutyForDay(6)),
        }

        // Create the atomic period
        const result = addEffectivePeriod({
            representativeId: repId,
            startDate,
            endDate,
            weeklyPattern,
            reason: note || 'Ajuste de horario mixto',
        })

        if (!result.success) {
            alert(result.error || 'Error al guardar el período')
            return
        }

        onClose()
    }

    const hasChanges = true // Always allow save to be safe, or compare diff with deep equal (skipping for simplicity)

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--bg-panel)',
                    borderRadius: '12px',
                    width: '600px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '24px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Calendar size={24} color="var(--accent)" />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Gestión de Horario Mixto
                        </h2>
                    </div>
                    <p style={{ margin: '8px 0 0 36px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        {repName} • Turno Base: {representative.baseShift === 'DAY' ? 'Día' : 'Noche'}
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Alert */}
                    <div
                        style={{
                            background: '#eff6ff',
                            border: '1px solid #93c5fd',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '24px',
                            display: 'flex',
                            gap: '12px',
                        }}
                    >
                        <AlertCircle size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '14px', color: '#1e40af' }}>
                            <strong>Selecciona el estado de cada día:</strong>
                            <br />
                            Clic 1: 🔵 MIXTO (Ambos turnos)
                            <br />
                            Clic 2: 🔴 LIBRE (No trabaja)
                            <br />
                            Clic 3: ⚪ BASE ({representative.baseShift === 'DAY' ? 'Día' : 'Noche'})
                        </div>
                    </div>

                    {/* Week Calendar */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                            Días Mixtos
                        </label>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                gap: '8px',
                            }}
                        >
                            {dayNames.map((name, index) => {
                                const state = dayStates[index]
                                const wasBaseMixed = baseMixedDays.includes(index)
                                // Change detection is tricky now with 3 states, simplifying to "is different from default"
                                // Logic: wasMixed -> Default MIXED. wasNotMixed -> Default BASE.
                                const defaultState = wasBaseMixed ? 'MIXED' : 'BASE'
                                const isChanging = state !== defaultState

                                let bg = 'var(--bg-muted)'
                                let borderColor = 'var(--border-subtle)'
                                let textColor = 'var(--text-muted)'
                                let labelColor = 'var(--text-muted)'
                                let labelText = 'BASE'

                                if (state === 'MIXED') {
                                    bg = '#eef2ff'
                                    borderColor = '#6366f1'
                                    textColor = '#4f46e5'
                                    labelColor = '#4338ca'
                                    labelText = 'MIXTO'
                                } else if (state === 'OFF') {
                                    bg = '#fef2f2'
                                    borderColor = '#fca5a5'
                                    textColor = '#991b1b'
                                    labelColor = '#b91c1c'
                                    labelText = 'LIBRE'
                                }

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => toggleDay(index)}
                                        style={{
                                            padding: '16px 8px',
                                            borderRadius: '8px',
                                            border: '2px solid',
                                            cursor: 'pointer',
                                            background: bg,
                                            borderColor: borderColor,
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            minHeight: '80px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: labelColor, marginBottom: '4px' }}>
                                            {dayAbbrev[index]}
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: textColor,
                                            textDecoration: state === 'OFF' ? 'line-through' : 'none'
                                        }}>
                                            {labelText}
                                        </div>
                                        {isChanging && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: '#f59e0b',
                                                }}
                                            />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Changes Summary */}
                    {hasChanges && (
                        <div
                            style={{
                                background: '#fef3c7',
                                border: '1px solid #fbbf24',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                fontSize: '13px',
                            }}
                        >
                            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>
                                📝 Cambios detectados:
                            </div>
                            <div style={{ color: '#78350f' }}>
                                {dayStates.map((state, i) => {
                                    const wasMixed = baseMixedDays.includes(i)
                                    const defaultState = wasMixed ? 'MIXED' : 'BASE'
                                    if (state === defaultState) return null

                                    if (state === 'MIXED') return <div key={i}>• {dayNames[i]}: Ahora es MIXTO</div>
                                    if (state === 'OFF') return <div key={i}>• {dayNames[i]}: Ahora es LIBRE (No trabaja)</div>
                                    if (state === 'BASE') return <div key={i}>• {dayNames[i]}: Vuelve a turno BASE</div>
                                    return null
                                })}
                            </div>
                        </div>
                    )}

                    {/* Date Range */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>
                            Período de Aplicación
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    Desde
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid var(--border-strong)',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        background: 'var(--bg-muted)',
                                        color: 'var(--text-main)',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    Hasta
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid var(--border-strong)',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        background: 'var(--bg-muted)',
                                        color: 'var(--text-main)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>
                            Nota (opcional)
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Ej: Ajuste por inicio de universidad"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border-strong)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                minHeight: '60px',
                                resize: 'vertical',
                                background: 'var(--bg-muted)',
                                color: 'var(--text-main)',
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                border: '1px solid var(--border-strong)',
                                borderRadius: '8px',
                                background: 'var(--bg-panel)',
                                color: 'var(--text-main)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <X size={16} />
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                background: hasChanges ? 'var(--accent)' : '#e5e7eb',
                                color: hasChanges ? 'white' : '#9ca3af',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: hasChanges ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <Check size={16} />
                            Aplicar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
