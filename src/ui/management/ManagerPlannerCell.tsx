'use client'

import React from 'react'
import { ManagerVisualState } from '@/application/ui-adapters/types'

export const managerCellStyles: Record<ManagerVisualState, React.CSSProperties> = {
    DAY: { background: '#e0f2fe', color: '#075985' },
    NIGHT: { background: '#312e81', color: '#e0e7ff' },
    INTER: { background: '#e5e7eb', color: '#374151' },
    MONITOR: { background: '#dcfce7', color: '#166534' },
    VACACIONES: { background: '#ecfeff', color: '#065f46' },
    LICENCIA: { background: '#f3e8ff', color: '#6b21a8' },
    AUS_JUST: { background: '#fef9c3', color: '#854d0e' },
    AUS_UNJUST: { background: '#fee2e2', color: '#7f1d1d', fontWeight: 600 },
    OFF: { background: '#f3f4f6', color: '#6b7280' },
    EMPTY: { background: 'transparent', color: '#9ca3af' },
}

interface Props {
    state: ManagerVisualState
    label?: string
    tooltip?: string
    onClick?: () => void
    onChange?: (value: string) => void
    currentValue?: string // Needed to show correct selection in dropdown
}

export function ManagerPlannerCell({ state, label, tooltip, onClick, onChange, currentValue }: Props) {
    const style = managerCellStyles[state] || managerCellStyles.EMPTY

    // Determine current value for the select if not explicitly passed
    // Try to guess from state, but better to have it passed explicitly if possible.
    // If we use this component for non-editable things, onChange is undefined.

    // Safety check for interaction
    const isInteractive = !!onChange

    return (
        <div
            style={{
                ...style,
                borderRadius: '6px',
                padding: '0', // Reset padding for relative positioning context
                textAlign: 'center',
                cursor: isInteractive ? 'pointer' : 'default',
                position: 'relative',
                fontSize: '13px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            title={tooltip} // ✅ Moved tooltip here so it works even if content covers it
            onClick={onClick}
        >
            {label ?? '—'}

            {tooltip && (
                <span
                    style={{
                        position: 'absolute',
                        top: 2,
                        right: 4,
                        fontSize: '9px',
                        opacity: 0.7,
                        pointerEvents: 'none' // Click through to select
                    }}
                >
                    ⓘ
                </span>
            )}

            {isInteractive && (
                <select
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                        appearance: 'none', // Remove native arrow
                    }}
                    value={currentValue ?? ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent bubbling if container has click
                >
                    <option value="" disabled>Seleccionar...</option>
                    <option value="DAY">Día</option>
                    <option value="NIGHT">Noche</option>
                    <option value="INTER">Intermedio</option>
                    <option value="MONITORING">Monitoreo</option>
                    <option value="OFF">OFF</option>
                    <option value="EMPTY">—</option>
                </select>
            )}
        </div>
    )
}
