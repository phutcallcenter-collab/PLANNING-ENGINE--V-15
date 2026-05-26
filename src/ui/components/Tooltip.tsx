'use client'

import React, { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const tooltipId = React.useId()

  // If there is no content, render only the children without any tooltip functionality.
  if (!content) {
    return <>{children}</>
  }

  return (
    <div
      className="relative inline-block"
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              zIndex: 50,
              bottom: '100%',
              marginBottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max-content',
              maxWidth: 'min(320px, calc(100vw - 32px))',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: 1.45,
              textAlign: 'left',
              color: 'white',
              backgroundColor: 'hsl(0, 0%, 13%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              pointerEvents: 'none',
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
