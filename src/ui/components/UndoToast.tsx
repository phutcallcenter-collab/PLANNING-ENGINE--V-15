'use client'

import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'
import { useAppStore, UndoAction } from '@/store/useAppStore'

export function UndoToast() {
  const stack = useAppStore(s => s.undoStack)
  const executeUndo = useAppStore(s => s.executeUndo)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 2000,
      }}
    >
      <AnimatePresence>
        {stack.map(action => (
          <motion.div
            key={action.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              background: 'hsl(220, 20%, 15%)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span>{action.label}</span>
            <button
              onClick={() => executeUndo(action.id)}
              style={{
                fontWeight: 600,
                color: 'hsl(200, 100%, 70%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Deshacer
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
