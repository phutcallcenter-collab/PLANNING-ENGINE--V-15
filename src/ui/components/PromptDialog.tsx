'use client'

import React, { ReactNode, useState } from 'react'
import { motion } from 'framer-motion'

interface PromptDialogProps {
    open: boolean
    title: string
    description?: ReactNode
    placeholder?: string
    initialValue?: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: (value: string) => void
    onCancel: () => void
    optional?: boolean
}

export function PromptDialog({
    open,
    title,
    description,
    placeholder = '',
    initialValue = '',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    optional = false,
}: PromptDialogProps) {
    const [value, setValue] = useState(initialValue)

    if (!open) return null

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    }

    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '28rem',
    }

    const buttonStyle: React.CSSProperties = {
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 500,
    }

    const textareaStyle: React.CSSProperties = {
        width: '100%',
        minHeight: '80px',
        padding: '0.75rem',
        marginTop: '1rem',
        marginBottom: '0.5rem',
        borderRadius: '0.375rem',
        border: '1px solid #d1d5db',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        resize: 'vertical',
    }

    const handleConfirm = () => {
        if (!optional && !value.trim()) return
        onConfirm(value)
    }

    return (
        <div style={modalOverlayStyle} onClick={onCancel}>
            <motion.div
                style={modalContentStyle}
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
            >
                <div style={{ padding: '1.5rem' }}>
                    <h2
                        style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                        }}
                    >
                        {title}
                    </h2>
                    {description && (
                        <div
                            style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                lineHeight: '1.5',
                            }}
                        >
                            {description}
                        </div>
                    )}

                    <textarea
                        style={textareaStyle}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                    />

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.5rem',
                            marginTop: '1rem',
                        }}
                    >
                        <button
                            onClick={onCancel}
                            style={{
                                ...buttonStyle,
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                            }}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!optional && !value.trim()}
                            style={{
                                ...buttonStyle,
                                backgroundColor: '#2563eb', // Blue for info/input
                                color: 'white',
                                opacity: (!optional && !value.trim()) ? 0.5 : 1,
                                cursor: (!optional && !value.trim()) ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
