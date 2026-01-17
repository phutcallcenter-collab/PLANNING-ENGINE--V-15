'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle } from 'lucide-react'

type Props = {
  message?: string
  type?: 'error' | 'success' | 'warning'
}

export function InlineFeedback({ message, type = 'error' }: Props) {
  if (!message) return null

  const styles = {
    error: {
      backgroundColor: 'hsl(0, 100%, 97%)',
      color: 'hsl(0, 80%, 40%)',
      border: '1px solid hsl(0, 100%, 90%)',
    },
    success: {
      backgroundColor: 'hsl(140, 100%, 97%)',
      color: 'hsl(140, 80%, 30%)',
      border: '1px solid hsl(140, 100%, 90%)',
    },
    warning: {
      backgroundColor: '#fefce8',
      color: '#a16207',
      border: '1px solid #fde047',
    },
  }

  const Icon =
    type === 'error'
      ? AlertTriangle
      : type === 'success'
        ? CheckCircle
        : AlertTriangle

  const selectedStyle = styles[type]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '6px',
          padding: '10px 12px',
          fontSize: '14px',
          ...selectedStyle,
        }}
      >
        <Icon size={16} />
        <span>{message}</span>
      </motion.div>
    </AnimatePresence>
  )
}
