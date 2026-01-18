'use client'

import React, { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useWeekNavigator } from '@/hooks/useWeekNavigator'
import { format, parseISO, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ManagerDuty } from '@/domain/management/types'
import { Plus, Trash2, User } from 'lucide-react'
import { ManagerPlannerCell } from '@/ui/management/ManagerPlannerCell'
import { resolveEffectiveManagerDay } from '@/application/ui-adapters/resolveEffectiveManagerDay'
import { mapManagerDayToCell } from '@/application/ui-adapters/mapManagerDayToCell'
import { EffectiveManagerDay } from '@/application/ui-adapters/types'

// Weights for workload calculation
const WORKLOAD_WEIGHTS: Record<string, number> = {
    NIGHT: 3,
    DAY: 2,
    INTER: 1.5,
    MONITOR: 1,
}

export function ManagerScheduleManagement() {
    const {
        managers,
        managementSchedules,
        incidents,
        allCalendarDaysForRelevantMonths,
        representatives,
        addManager,
        removeManager,
        setManagerDuty,
        clearManagerDuty,
        planningAnchorDate,
        setPlanningAnchorDate,
        copyManagerWeek,
    } = useAppStore(s => ({
        managers: s.managers,
        managementSchedules: s.managementSchedules,
        incidents: s.incidents,
        allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
        representatives: s.representatives,
        addManager: s.addManager,
        removeManager: s.removeManager,
        setManagerDuty: s.setManagerDuty,
        clearManagerDuty: s.clearManagerDuty,
        planningAnchorDate: s.planningAnchorDate,
        setPlanningAnchorDate: s.setPlanningAnchorDate,
        copyManagerWeek: s.copyManagerWeek
    }))

    const { weekDays, label: weekLabel, handlePrevWeek, handleNextWeek } = useWeekNavigator(
        planningAnchorDate,
        setPlanningAnchorDate
    )

    const [newManagerName, setNewManagerName] = useState('')

    const handleCreateManager = () => {
        if (!newManagerName.trim()) return
        addManager({ name: newManagerName.trim() })
        setNewManagerName('')
    }

    const handleDutyChange = (managerId: string, date: string, value: string) => {
        if (value === 'EMPTY') {
            const note = window.prompt('Limpiar día y añadir comentario (opcional):', '')
            // allow empty string to clear without note
            if (note === null) return

            setManagerDuty(managerId, date, null, note || undefined)
        } else if (value === 'OFF') {
            setManagerDuty(managerId, date, 'OFF', undefined)
        } else {
            // DAY, NIGHT, INTER, MONITORING
            setManagerDuty(managerId, date, value as ManagerDuty)
        }
    }

    const handleCopyWeek = () => {
        const confirm = window.confirm(
            `¿Estás seguro de copiar la planificación de esta semana (${weekLabel}) a la siguiente? Esto sobrescribirá los datos existentes de la próxima semana.`
        )
        if (!confirm) return

        const currentWeekDates = weekDays.map(d => d.date)
        const nextWeekDates = currentWeekDates.map(dateStr => {
            const date = parseISO(dateStr)
            return format(addDays(date, 7), 'yyyy-MM-dd')
        })

        copyManagerWeek(currentWeekDates, nextWeekDates)

        // Optional: Navigate to next week to see result
        handleNextWeek()
    }

    return (
        <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#111827' }}>
                        Horarios de Gerencia
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        Planificación semanal con soporte para incidencias.
                    </p>
                </div>

                {/* Time Sovereign */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <button onClick={handlePrevWeek} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>&lt;</button>
                    <span style={{ fontSize: '13px', fontWeight: 500, width: '180px', textAlign: 'center' }}>{weekLabel}</span>
                    <button onClick={handleNextWeek} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>&gt;</button>
                </div>

                <div style={{ marginLeft: '12px' }}>
                    <button
                        onClick={handleCopyWeek}
                        style={{
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: 'var(--radius-md)',
                            padding: '4px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            color: '#374151',
                        }}
                        title="Copiar planificación a la próxima semana"
                    >
                        Copiar ➝
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-card)', overflow: 'hidden', background: 'white', boxShadow: 'var(--shadow-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '12px 16px', color: '#374151', fontWeight: 600, width: '200px' }}>Supervisor</th>
                            {weekDays.map(day => (
                                <th key={day.date} style={{ textAlign: 'center', padding: '12px 8px', color: '#374151', fontWeight: 600 }}>
                                    <div>{format(parseISO(day.date), 'EEE', { locale: es })}</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>{format(parseISO(day.date), 'd')}</div>
                                </th>
                            ))}
                            <th style={{ width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {managers
                            .filter(manager => {
                                const rep = representatives.find(r => r.id === manager.id)
                                return rep ? rep.isActive !== false : true
                            })
                            .map(manager => {
                                const representative = representatives.find(r => r.id === manager.id)
                                const weeklyPlan = managementSchedules[manager.id] || null

                                // Calculate Weekly Load
                                const weeklyLoad = weekDays.reduce((sum, day) => {
                                    const effectiveDay = resolveEffectiveManagerDay(
                                        weeklyPlan,
                                        incidents,
                                        day.date,
                                        allCalendarDaysForRelevantMonths,
                                        representative
                                    )
                                    const cellState = mapManagerDayToCell(effectiveDay, manager.name)
                                    // Weights are now centralized in WORKLOAD_WEIGHTS constant
                                    const weight = WORKLOAD_WEIGHTS[cellState.state] ?? 0
                                    return sum + weight
                                }, 0)

                                // Load Color Logic
                                let loadColor = '#22c55e' // Green (< 12)
                                if (weeklyLoad >= 12 && weeklyLoad < 15) loadColor = '#eab308' // Yellow
                                if (weeklyLoad >= 15 && weeklyLoad < 18) loadColor = '#f97316' // Orange
                                if (weeklyLoad >= 18) loadColor = '#ef4444' // Red

                                // Progress (capped at 100% for ~20 points visual max)
                                const progress = Math.min((weeklyLoad / 20) * 100, 100)

                                return (
                                    <tr key={manager.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '8px 16px', color: '#111827', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '24px', height: '24px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                        <User size={14} />
                                                    </div>
                                                    {manager.name}
                                                </div>

                                                {/* Workload Meter */}
                                                <div
                                                    title={`Carga Operativa Semanal: ${Number(weeklyLoad.toFixed(1))} pts\n\nSuma del tipo de turnos asignados esta semana.\n(Noche = más carga, Día = media, Monitoreo = baja)\n\nLo normal está entre 12 y 15 pts.\nEste valor es solo informativo.\nNo mide desempeño ni productividad.`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '11px',
                                                        color: '#6b7280',
                                                        paddingLeft: '32px'
                                                    }}
                                                >
                                                    <div style={{ width: '60px', height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${progress}%`, height: '100%', background: loadColor, transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 500 }}>{Number(weeklyLoad.toFixed(1))}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {weekDays.map(day => {
                                            const effectiveDay = resolveEffectiveManagerDay(
                                                weeklyPlan,
                                                incidents,
                                                day.date,
                                                allCalendarDaysForRelevantMonths,
                                                representative
                                            )

                                            const cellState = mapManagerDayToCell(effectiveDay, manager.name)

                                            // Determine current value for selector
                                            let currentValue = 'EMPTY'
                                            if (effectiveDay.kind === 'DUTY') currentValue = effectiveDay.duty
                                            else if (effectiveDay.kind === 'OFF') currentValue = 'OFF'
                                            else if (effectiveDay.kind === 'EMPTY') currentValue = 'EMPTY'

                                            const isEditable = cellState.isEditable && effectiveDay.kind !== 'VACATION' && effectiveDay.kind !== 'LICENSE'

                                            return (
                                                <td key={day.date} style={{ padding: '6px' }}>
                                                    <ManagerPlannerCell
                                                        state={cellState.state}
                                                        label={cellState.label}
                                                        tooltip={cellState.tooltip}
                                                        currentValue={currentValue}
                                                        onChange={isEditable ? (val) => handleDutyChange(manager.id, day.date, val) : undefined}
                                                    />
                                                </td>
                                            )
                                        })}
                                        <td style={{ padding: '0 8px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => removeManager(manager.id)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#fee2e2' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} color="#ef4444" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        {managers.length === 0 && (
                            <tr>
                                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                                    No hay supervisores registrados. Añade uno abajo.
                                </td>
                            </tr>
                        )}

                        {/* Add Row */}
                        <tr style={{ background: '#fefce8' }}>
                            <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        placeholder="Nuevo Supervisor..."
                                        value={newManagerName}
                                        onChange={(e) => setNewManagerName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateManager()}
                                        style={{
                                            border: '1px solid #d1d5db',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '4px 8px',
                                            fontSize: '14px',
                                            flex: 1,
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        onClick={handleCreateManager}
                                        disabled={!newManagerName.trim()}
                                        style={{
                                            background: '#16a34a',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            opacity: !newManagerName.trim() ? 0.5 : 1
                                        }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </td>
                            <td colSpan={8}></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
