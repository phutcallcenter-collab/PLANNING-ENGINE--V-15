/**
 * Special Schedule Wizard
 * 
 * Guided interface for creating schedule exceptions.
 * Progressive single-view design: one question at a time, all choices visible.
 */

import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { WizardState, ScheduleIntent } from './wizardTypes'
import { wizardToSpecialSchedule } from './wizardToSpecialSchedule'
import { format, parseISO, differenceInWeeks } from 'date-fns'

const DaysOfWeekSelector = ({
    selectedDays,
    onToggle
}: {
    selectedDays: number[]
    onToggle: (day: number) => void
}) => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // 0 = Sunday

    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {days.map((day, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onToggle(index)}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selectedDays.includes(index) ? '#eef2ff' : 'white',
                        borderColor: selectedDays.includes(index) ? '#6366f1' : '#d1d5db',
                        color: selectedDays.includes(index) ? '#4f46e5' : '#6b7280',
                        transition: 'all 120ms ease',
                    }}
                >
                    {day}
                </button>
            ))}
        </div>
    )
}

export function SpecialScheduleWizard({
    repId,
    repName,
    onSave
}: {
    repId: string
    repName: string
    onSave: () => void
}) {
    const [state, setState] = useState<WizardState>({
        intent: null,
        days: [],
        replaceBaseMixedDays: true, // Default: replace (normal operational rule)
    })

    const addSpecialSchedule = useAppStore(s => s.addSpecialSchedule)
    const representatives = useAppStore(s => s.representatives ?? [])

    // Detect if base schedule is mixed
    const representative = representatives.find(r => r.id === repId)
    const baseMixedDays = representative?.mixProfile?.type === 'WEEKDAY'
        ? [1, 2, 3, 4] // Mon-Thu
        : representative?.mixProfile?.type === 'WEEKEND'
            ? [5, 6, 0] // Fri-Sun
            : []
    const isBaseMixed = baseMixedDays.length > 0

    // Helper to update wizard state
    const updateState = (partial: Partial<WizardState>) => {
        setState(prev => ({ ...prev, ...partial }))
    }

    // Quick shortcuts for days
    const selectWeekdays = () => updateState({ days: [1, 2, 3, 4, 5] })
    const selectWeekend = () => updateState({ days: [0, 6] })
    const selectAllDays = () => updateState({ days: [0, 1, 2, 3, 4, 5, 6] })

    // Dynamic feedback
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const selectedDayNames = state.days
        .sort((a, b) => a - b)
        .map(d => dayNames[d])
        .join(', ')

    const weeksDuration = useMemo(() => {
        if (!state.startDate || !state.endDate) return null
        try {
            const weeks = differenceInWeeks(parseISO(state.endDate), parseISO(state.startDate))
            return weeks
        } catch {
            return null
        }
    }, [state.startDate, state.endDate])

    // Summary for final confirmation
    const canShowSummary = state.intent && state.days.length > 0 && state.startDate && state.endDate

    const summaryText = useMemo(() => {
        if (!canShowSummary) return null

        let actionText = ''
        switch (state.intent) {
            case 'WORK_SINGLE_SHIFT':
                actionText = state.shift === 'DAY' ? 'Trabajará en turno Día' : 'Trabajará en turno Noche'
                break
            case 'WORK_BOTH_SHIFTS':
                actionText = 'Trabajará en ambos turnos (mixto)'
                break
            case 'OFF':
                actionText = 'No trabajará (libre)'
                break
        }

        return {
            action: actionText,
            period: `${format(parseISO(state.startDate!), 'dd/MM/yyyy')} – ${format(parseISO(state.endDate!), 'dd/MM/yyyy')}`,
            days: selectedDayNames,
        }
    }, [canShowSummary, state.intent, state.shift, state.startDate, state.endDate, selectedDayNames])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const schedules = wizardToSpecialSchedule(state, repId, baseMixedDays)
            schedules.forEach(schedule => addSpecialSchedule(schedule))
            onSave()
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al guardar')
        }
    }

    const radioStyle = (selected: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        border: '2px solid',
        borderRadius: '8px',
        borderColor: selected ? '#6366f1' : '#e5e7eb',
        background: selected ? '#f5f3ff' : 'white',
        cursor: 'pointer',
        transition: 'all 120ms ease',
        fontSize: '15px',
        fontWeight: 500,
        color: selected ? '#4f46e5' : '#374151',
    })

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                background: 'var(--bg-panel)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                margin: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
            }}
        >
            {/* Header */}
            <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Ajuste temporal de horario
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Define excepciones al horario habitual durante un período
                </p>
            </div>

            {/* Step 1: Intent */}
            <div>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                    ¿Qué cambio necesitas?
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={radioStyle(state.intent === 'WORK_SINGLE_SHIFT')}>
                        <input
                            type="radio"
                            name="intent"
                            checked={state.intent === 'WORK_SINGLE_SHIFT'}
                            onChange={() => updateState({ intent: 'WORK_SINGLE_SHIFT', shift: 'DAY' })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Trabajará en un turno específico
                    </label>
                    <label style={radioStyle(state.intent === 'WORK_BOTH_SHIFTS')}>
                        <input
                            type="radio"
                            name="intent"
                            checked={state.intent === 'WORK_BOTH_SHIFTS'}
                            onChange={() => updateState({ intent: 'WORK_BOTH_SHIFTS', shift: undefined })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Trabajará en ambos turnos (mixto)
                    </label>
                    <label style={radioStyle(state.intent === 'OFF')}>
                        <input
                            type="radio"
                            name="intent"
                            checked={state.intent === 'OFF'}
                            onChange={() => updateState({ intent: 'OFF', shift: undefined })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        No trabajará (libre)
                    </label>
                </div>
            </div>

            {/* Step 1.5: Mixed shift replacement question (conditional) */}
            {state.intent === 'WORK_BOTH_SHIFTS' && isBaseMixed && (
                <div>
                    <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                        ¿Este ajuste reemplaza los días mixtos habituales?
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={radioStyle(state.replaceBaseMixedDays === true)}>
                            <input
                                type="radio"
                                name="replaceBaseMixedDays"
                                checked={state.replaceBaseMixedDays === true}
                                onChange={() => updateState({ replaceBaseMixedDays: true })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            Sí, solo estos días serán mixtos
                        </label>
                        <label style={radioStyle(state.replaceBaseMixedDays === false)}>
                            <input
                                type="radio"
                                name="replaceBaseMixedDays"
                                checked={state.replaceBaseMixedDays === false}
                                onChange={() => updateState({ replaceBaseMixedDays: false })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            No, se suman a los habituales (caso especial)
                        </label>
                    </div>
                </div>
            )}

            {/* Step 2: Shift selection (conditional) */}
            {state.intent === 'WORK_SINGLE_SHIFT' && (
                <div>
                    <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                        ¿En qué turno trabajará?
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={radioStyle(state.shift === 'DAY')}>
                            <input
                                type="radio"
                                name="shift"
                                checked={state.shift === 'DAY'}
                                onChange={() => updateState({ shift: 'DAY' })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            Turno Día
                        </label>
                        <label style={radioStyle(state.shift === 'NIGHT')}>
                            <input
                                type="radio"
                                name="shift"
                                checked={state.shift === 'NIGHT'}
                                onChange={() => updateState({ shift: 'NIGHT' })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            Turno Noche
                        </label>
                    </div>
                </div>
            )}

            {state.intent === 'WORK_BOTH_SHIFTS' && (
                <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '14px', color: '#166534' }}>
                    Trabajará en ambos turnos
                </div>
            )}

            {state.intent === 'OFF' && (
                <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde047', borderRadius: '8px', fontSize: '14px', color: '#854d0e' }}>
                    No tendrá asignación
                </div>
            )}

            {/* Step 3: Days of week */}
            {state.intent && (
                <div>
                    <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>
                        ¿Qué días se verán afectados?
                    </label>
                    <DaysOfWeekSelector
                        selectedDays={state.days}
                        onToggle={(day) => {
                            const newDays = state.days.includes(day)
                                ? state.days.filter(d => d !== day)
                                : [...state.days, day]
                            updateState({ days: newDays })
                        }}
                    />
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={selectWeekdays} style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--bg-panel)', cursor: 'pointer' }}>
                            Lunes a Viernes
                        </button>
                        <button type="button" onClick={selectWeekend} style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--bg-panel)', cursor: 'pointer' }}>
                            Fin de semana
                        </button>
                        <button type="button" onClick={selectAllDays} style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--bg-panel)', cursor: 'pointer' }}>
                            Todos
                        </button>
                    </div>
                    {state.days.length > 0 && (
                        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                            Se aplicará los <strong>{selectedDayNames}</strong>
                        </p>
                    )}
                </div>
            )}

            {/* Step 4: Date range */}
            {state.intent && state.days.length > 0 && (
                <div>
                    <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>
                        ¿Durante qué período aplica este ajuste?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>
                                Desde
                            </label>
                            <input
                                type="date"
                                value={state.startDate || ''}
                                onChange={e => updateState({ startDate: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>
                                Hasta
                            </label>
                            <input
                                type="date"
                                value={state.endDate || ''}
                                onChange={e => updateState({ endDate: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '14px' }}
                            />
                        </div>
                    </div>
                    {weeksDuration !== null && weeksDuration >= 0 && (
                        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                            Este ajuste estará activo durante <strong>{weeksDuration} semana{weeksDuration !== 1 ? 's' : ''}</strong>
                        </p>
                    )}
                </div>
            )}

            {/* Step 5: Summary (The Guardian) */}
            {summaryText && (
                <div style={{ padding: '16px', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                        🧾 Resumen del ajuste
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{repName}</div>
                        <div>Durante el período <strong>{summaryText.period}</strong></div>
                        <div><strong>{summaryText.action}</strong></div>
                        <div>Los días: <strong>{summaryText.days}</strong></div>
                    </div>
                </div>
            )}

            {/* Optional note */}
            {state.intent && (
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-muted)' }}>
                        Motivo (opcional)
                    </label>
                    <input
                        type="text"
                        value={state.note || ''}
                        onChange={e => updateState({ note: e.target.value })}
                        placeholder="Ej: Universidad, Capacitación, Familiar enfermo"
                        style={{ width: '100%', padding: '10px', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <button
                    type="button"
                    onClick={onSave}
                    style={{ padding: '10px 16px', border: '1px solid var(--border-strong)', borderRadius: '8px', background: 'var(--bg-panel)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={!canShowSummary}
                    style={{
                        padding: '10px 20px',
                        background: canShowSummary ? '#111827' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: canShowSummary ? 'pointer' : 'not-allowed',
                        fontWeight: 600,
                        fontSize: '14px',
                    }}
                >
                    Guardar Horario
                </button>
            </div>
        </form>
    )
}

