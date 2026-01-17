'use client'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function OfflineBanner() {
    const { mounted, online } = useNetworkStatus()

    // 🔒 CRÍTICO: no renderizar nada hasta hidratar
    if (!mounted) return null

    if (online) return null

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                width: '100%',
                background: '#f3f4f6',
                color: '#374151',
                fontSize: '12px',
                padding: '6px 12px',
                borderBottom: '1px solid #e5e7eb',
                textAlign: 'center',
            }}
        >
            Modo consulta — los cambios no se guardarán sin conexión
        </div>
    )
}
