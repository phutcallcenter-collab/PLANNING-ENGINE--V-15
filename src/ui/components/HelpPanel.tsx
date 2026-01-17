import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpPanelProps {
    title: string
    points: string[]
}

export function HelpPanel({ title, points }: HelpPanelProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Link discreto */}
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6'
                    e.currentTarget.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = '#6b7280'
                }}
            >
                <HelpCircle size={14} />
                {title}
            </button>

            {/* Modal chico */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.3)',
                            zIndex: 999,
                        }}
                    />

                    {/* Panel */}
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'var(--bg-panel)',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            zIndex: 1000,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>
                                {title}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '4px',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {points.map((point, index) => (
                                <li
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        fontSize: '14px',
                                        color: 'var(--text-main)',
                                        lineHeight: '1.5',
                                    }}
                                >
                                    <span style={{ color: '#6366f1', fontWeight: 600 }}>•</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </>
    )
}

