'use client'

import { useEffect } from 'react'
import { OfflineBanner } from '@/ui/system/OfflineBanner'
import { UndoToast } from '@/ui/components/UndoToast'

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const reg = await navigator.serviceWorker.register('/sw.js')

                    if (reg.waiting) {
                        console.info('[PWA] Nueva versión en espera')
                    }

                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing
                        if (!newWorker) return

                        newWorker.addEventListener('statechange', () => {
                            if (
                                newWorker.state === 'installed' &&
                                navigator.serviceWorker.controller
                            ) {
                                console.info('[PWA] Nueva versión lista (se activará al recargar)')
                            }
                        })
                    })
                } catch {
                    // Fail silently
                }
            })
        }
    }, [])

    return (
        <>
            <OfflineBanner />
            <UndoToast />
            {children}
        </>
    )
}
