/**
 * 🟢 CANONICAL WIZARD: Explicit Weekly Pattern Constructor
 * 
 * Determines the simplified, explicit schedule for a range of dates.
 * "What you see is what you get."
 */

import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { SpecialSchedule, DailyScheduleState, Representative } from '@/domain/types'
import { resolveWeeklyPatternSnapshot } from '@/application/scheduling/resolveWeeklyPatternSnapshot'
import { canUseMixto } from '@/application/scheduling/scheduleCapabilities'
import { Calendar, Check, X, Info, Moon, Sun, Ban, Shuffle, LayoutTemplate, RotateCcw, AlertTriangle } from 'lucide-react'
import { format, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

export function SpecialScheduleWizard({
    repId,
    repName,
    onSave,
    initialSchedule
}: {
    repId: string
    repName: string
    onSave: () => void
    initialSchedule?: SpecialSchedule
}) {
    const { representatives, addSpecialSchedule, updateSpecialSchedule } = useAppStore()
    const representative = representatives.find(r => r.id === repId)

    // Guards
    if (!representative) return null

    const isMixedProfile = canUseMixto(representative)
    const baseShift = representative.baseShift || 'DAY'

    // 🟢 UI State: Includes 'BASE' as a "soft" state that resolves to hard state on save
    type UiDayState = DailyScheduleState | 'BASE_REF'

    // Initialize logic
    const getInitialPattern = (): UiDayState[] => {
        if (initialSchedule) {
            // Map existing explicit pattern to UI
            // Note: If the save logic resolved 'BASE', we won't see 'BASE_REF' here, which is correct.
            // The history is frozen.
            const pattern: UiDayState[] = []
            for (let i = 0; i < 7; i++) {
                pattern.push(initialSchedule.weeklyPattern[i as 0 | 1 | 2 | 3 | 4 | 5 | 6] || 'OFF')
            }
            return pattern
        }
        return Array(7).fill('BASE_REF')
    }

    const [dayStates, setDayStates] = useState<UiDayState[]>(getInitialPattern())
    const [activeDayMenu, setActiveDayMenu] = useState<number | null>(null)

    // Dates
    const defaultStart = format(startOfWeek(new Date(), { locale: es, weekStartsOn: 1 }), 'yyyy-MM-dd')
    const defaultEnd = format(addDays(new Date(), 90), 'yyyy-MM-dd')

    const [startDate, setStartDate] = useState(initialSchedule?.from || defaultStart)
    const [endDate, setEndDate] = useState(initialSchedule?.to || defaultEnd)
    const [note, setNote] = useState(initialSchedule?.note || '')

    // Interaction Logic
    const handleDayClick = (index: number) => {
        setActiveDayMenu(activeDayMenu === index ? null : index)
    }

    const selectState = (index: number, next: UiDayState) => {
        setDayStates(prev => {
            const newStates = [...prev]
            newStates[index] = next
            return newStates
        })
        setActiveDayMenu(null)
    }

    const handleSave = () => {
        // 🟢 RESOLUTION AT SAVE (Snapshotting)
        // Delegated to pure domain helper
        const finalPattern = resolveWeeklyPatternSnapshot(representative, dayStates)

        const payload = {
            targetId: repId,
            scope: 'INDIVIDUAL' as const,
            from: startDate,
            to: endDate,
            weeklyPattern: finalPattern,
            note: note || 'Ajuste de Horario Especial'
        }

        let result
        if (initialSchedule) {
            result = updateSpecialSchedule(initialSchedule.id, payload)
        } else {
            result = addSpecialSchedule(payload)
        }

        if (result.success) {
            onSave()
        } else {
            alert(result.message || 'Error al guardar')
        }
    }

    // Render Helpers
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const dayAbbrev = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

    const renderIcon = (state: UiDayState) => {
        switch (state) {
            case 'OFF': return <Ban size={16} />
            case 'MIXTO': return <Shuffle size={16} />
            case 'DAY': return <Sun size={16} />
            case 'NIGHT': return <Moon size={16} />
            case 'BASE_REF': return <RotateCcw size={14} />
        }
    }

    const getStyle = (state: UiDayState, isInvalidMixto: boolean) => {
        const base = {
            border: '2px solid transparent',
            bg: 'var(--bg-muted)',
            text: 'var(--text-muted)',
            label: 'BASE'
        }

        if (isInvalidMixto) return { ...base, bg: '#fff7ed', border: '#fdba74', text: '#c2410c', label: 'INVALID' }
        if (state === 'OFF') return { ...base, bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: 'LIBRE' }
        if (state === 'MIXTO') return { ...base, bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8', label: 'MIXTO' }
        if (state === 'DAY') return { ...base, bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', label: 'DÍA' }
        if (state === 'NIGHT') return { ...base, bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'NOCHE' } // Using green for night/shift distinct

        return base
    }

    const explicitOptions: { label: string, value: UiDayState }[] = [
        { label: 'Día Libre', value: 'OFF' },
        { label: 'Turno Día', value: 'DAY' },
        { label: 'Turno Noche', value: 'NIGHT' },
    ]

    if (isMixedProfile) {
        explicitOptions.push({ label: 'Turno Mixto', value: 'MIXTO' })
    }

    return (
        <div style={{
            background: 'var(--bg-panel)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            margin: '16px 0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            position: 'relative' // Context for backdrop
        }}>
            {/* Backdrop for click away */}
            {activeDayMenu !== null && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40, cursor: 'default' }}
                    onClick={() => setActiveDayMenu(null)}
                />
            )}

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Constructo de Semana</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                        Define explícitamente el patrón para {repName} en este período.
                    </p>
                </div>
            </div>

            {/* Pattern Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '24px' }}>
                {dayStates.map((state, index) => {
                    // Check logic consistency
                    const isInvalidMixto = state === 'MIXTO' && !isMixedProfile
                    const style = getStyle(state, isInvalidMixto)
                    const isActive = activeDayMenu === index
                    return (
                        <div key={index} style={{ position: 'relative', zIndex: isActive ? 50 : 1 }}>
                            <button
                                onClick={() => handleDayClick(index)}
                                style={{
                                    width: '100%',
                                    padding: '12px 4px',
                                    borderRadius: '8px',
                                    border: `2px solid ${style.border}`,
                                    background: style.bg,
                                    color: style.text,
                                    cursor: 'pointer',
                                    minHeight: '80px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.1s ease',
                                    boxShadow: isActive ? '0 0 0 4px rgba(0,0,0,0.05)' : 'none',
                                    position: 'relative'
                                }}
                            >
                                {isInvalidMixto && (
                                    <div style={{ position: 'absolute', top: 4, right: 4, color: '#c2410c' }}>
                                        <AlertTriangle size={12} />
                                    </div>
                                )}
                                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{dayAbbrev[index]}</div>
                                {renderIcon(state)}
                                <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '6px' }}>{style.label}</div>
                            </button>

                            {/* Dropdown Menu */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '180px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '4px'
                                }}>
                                    {/* Explicit Options */}
                                    <div style={{ padding: '0 0 4px 0' }}>
                                        {explicitOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => selectState(index, opt.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    textAlign: 'left',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    color: 'var(--text-main)',
                                                    fontWeight: state === opt.value ? 600 : 400
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {renderIcon(opt.value)}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                                    {/* Restore Option */}
                                    <button
                                        onClick={() => selectState(index, 'BASE_REF')}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            textAlign: 'left',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            color: 'var(--text-muted)'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <RotateCcw size={14} />
                                        Restaurar Original
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Dates & Note */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Desde</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Hasta</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)' }} />
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Motivo / Nota</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: Acuerdo de estudios"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <button onClick={onSave} style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'transparent', cursor: 'pointer'
                }}>Cancelar</button>
                <button onClick={handleSave} style={{
                    padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <Check size={16} />
                    {initialSchedule ? 'Guardar Cambios' : 'Crear Regla'}
                </button>
            </div>
        </div>
    )
}
