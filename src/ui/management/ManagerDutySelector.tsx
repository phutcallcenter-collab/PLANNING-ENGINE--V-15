'use client'

import React from 'react'
import { ManagerDuty } from '@/domain/management/types'

const OPTIONS: { value: ManagerDuty | null; label: string }[] = [
    { value: 'DAY', label: 'Día' },
    { value: 'NIGHT', label: 'Noche' },
    { value: 'INTER', label: 'Inter' },
    { value: 'MONITORING', label: 'Monitoreo' },
    { value: null, label: 'Cancelar' },
]

export function ManagerDutySelector({
    value,
    onChange,
    onCancel,
}: {
    value: ManagerDuty | null
    onChange: (v: ManagerDuty | null) => void
    onCancel: () => void
}) {
    return (
        <select
            value={value ?? ''}
            onChange={e => {
                const val = e.target.value
                if (val === '') {
                    onCancel()
                } else {
                    onChange(val as ManagerDuty)
                }
            }}
            onBlur={onCancel}
            autoFocus
            style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
            }}
        >
            {OPTIONS.map(opt => (
                <option key={opt.value ?? 'cancel'} value={opt.value ?? ''}>
                    {opt.label}
                </option>
            ))}
        </select>
    )
}
