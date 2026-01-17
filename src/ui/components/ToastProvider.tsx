'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  title: string
  message: string
  type: ToastType
}

interface ToastInput {
  title: string
  message: string
  type?: ToastType
}

const ToastContext = createContext<{
  showToast: (toast: ToastInput) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (toastInput: ToastInput) => {
    const id = crypto.randomUUID()
    const type = toastInput.type || 'info'
    setToasts(prev => [...prev, { id, ...toastInput, type }])
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id))
    }, 3500)
  }

  const getToastStyle = (type: ToastType): React.CSSProperties => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: 'hsl(142.1, 80%, 96%)',
          color: 'hsl(142.1, 76.2%, 25%)',
          border: '1px solid hsl(142.1, 76.2%, 85%)',
        }
      case 'error':
        return {
          backgroundColor: 'hsl(0, 100%, 97%)',
          color: 'hsl(0, 80%, 45%)',
          border: '1px solid hsl(0, 100%, 90%)',
        }
       case 'warning':
        return {
          backgroundColor: 'hsl(45, 100%, 96%)',
          color: 'hsl(45, 80%, 25%)',
          border: '1px solid hsl(45, 100%, 85%)',
        }
      default:
        return {
          backgroundColor: 'hsl(210, 100%, 96%)',
          color: 'hsl(210, 80%, 35%)',
          border: '1px solid hsl(210, 100%, 88%)',
        }
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1001,
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="animate-fade-in"
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              fontWeight: 500,
              pointerEvents: 'auto',
              minWidth: '300px',
              ...getToastStyle(t.type),
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.title}</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
