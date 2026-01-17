import { useEffect, useState } from 'react'

export function useNetworkStatus() {
    const [mounted, setMounted] = useState(false)
    const [online, setOnline] = useState(true)

    useEffect(() => {
        setMounted(true)

        const update = () => setOnline(navigator.onLine)

        update()
        window.addEventListener('online', update)
        window.addEventListener('offline', update)

        return () => {
            window.removeEventListener('online', update)
            window.removeEventListener('offline', update)
        }
    }, [])

    return {
        mounted,
        online,
    }
}
