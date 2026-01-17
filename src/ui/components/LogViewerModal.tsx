import React from 'react'
import { X, Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LogViewerModalProps<T> {
    title: string
    isOpen: boolean
    onClose: () => void
    items: T[]
    renderItem: (item: T) => React.ReactNode
    emptyMessage?: string
}

export function LogViewerModal<T>({
    title,
    isOpen,
    onClose,
    items,
    renderItem,
    emptyMessage = 'No hay registros para mostrar.',
}: LogViewerModalProps<T>) {
    if (!isOpen) return null

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }

    const modalStyle: React.CSSProperties = {
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
    }

    const headerStyle: React.CSSProperties = {
        padding: '20px 24px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
    }

    const listStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: '0',
        background: '#f9fafb',
    }

    const listContentStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
    }

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={listStyle}>
                    {items.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                            {emptyMessage}
                        </div>
                    ) : (
                        <div style={listContentStyle}>
                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        borderBottom: '1px solid #e5e7eb',
                                        background: 'white',
                                        padding: '16px 24px',
                                    }}
                                >
                                    {renderItem(item)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '12px', textAlign: 'right' }}>
                    Mostrando {items.length} registros
                </div>
            </div>
        </div>
    )
}
