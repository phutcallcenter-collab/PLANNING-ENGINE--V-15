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
import styles from './SpecialScheduleWizard.module.css'

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
        <div className={styles.container}>
            {/* Backdrop for click away */}
            {activeDayMenu !== null && (
                <div
                    className={styles.backdrop}
                    onClick={() => setActiveDayMenu(null)}
                />
            )}

            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h3 className={styles.title}>Constructo de Semana</h3>
                    <p className={styles.subtitle}>
                        Define explícitamente el patrón para {repName} en este período.
                    </p>
                </div>
            </div>

            {/* Pattern Grid */}
            <div className={styles.weekGrid}>
                {dayStates.map((state, index) => {
                    // Check logic consistency
                    const isInvalidMixto = state === 'MIXTO' && !isMixedProfile
                    const style = getStyle(state, isInvalidMixto)
                    const isActive = activeDayMenu === index
                    return (
                        <div key={index} className={`${styles.dayCard} ${isActive ? styles.active : ''}`}>
                            <button
                                onClick={() => handleDayClick(index)}
                                className={styles.dayButton}
                                data-state={state}
                                data-invalid={isInvalidMixto}
                                aria-label={`Configurar ${dayNames[index]}`}
                            >
                                {isInvalidMixto && (
                                    <div className={styles.warningIcon}>
                                        <AlertTriangle size={12} />
                                    </div>
                                )}
                                <div className={styles.dayAbbrev}>{dayAbbrev[index]}</div>
                                {renderIcon(state)}
                                <div className={styles.dayLabel}>{style.label}</div>
                            </button>

                            {/* Dropdown Menu */}
                            {isActive && (
                                <div className={styles.menu}>
                                    {/* Explicit Options */}
                                    <div className={styles.menuSection}>
                                        {explicitOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => selectState(index, opt.value)}
                                                className={`${styles.menuButton} ${state === opt.value ? styles.menuButtonActive : ''}`}
                                            >
                                                {renderIcon(opt.value)}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Divider */}
                                    <div className={styles.menuDivider} />

                                    {/* Restore Option */}
                                    <button
                                        onClick={() => selectState(index, 'BASE_REF')}
                                        className={styles.menuButton}
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
            <div className={styles.dateGrid}>
                <div className={styles.dateGroup}>
                    <label htmlFor="startDate" className={styles.dateLabel}>Desde</label>
                    <input 
                        id="startDate"
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                        className={styles.dateInput}
                        aria-label="Fecha de inicio del horario especial"
                    />
                </div>
                <div className={styles.dateGroup}>
                    <label htmlFor="endDate" className={styles.dateLabel}>Hasta</label>
                    <input 
                        id="endDate"
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                        className={styles.dateInput}
                        aria-label="Fecha de fin del horario especial"
                    />
                </div>
            </div>

            <div className={styles.noteGroup}>
                <label htmlFor="note" className={styles.noteLabel}>Motivo / Nota</label>
                <input 
                    id="note"
                    type="text" 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    placeholder="Ej: Acuerdo de estudios"
                    className={styles.noteInput}
                />
            </div>

            <div className={styles.actions}>
                <button onClick={onSave} className={styles.cancelButton}>
                    Cancelar
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                    <Check size={16} />
                    {initialSchedule ? 'Guardar Cambios' : 'Crear Regla'}
                </button>
            </div>
        </div>
    )
}
