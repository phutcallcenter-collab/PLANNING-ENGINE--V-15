
'use client'

import { motion } from 'framer-motion'
import { motionPresets } from './motionPresets'

export function useMotionPreset(name: keyof typeof motionPresets) {
  const preset = motionPresets[name]

  return {
    MotionDiv: motion.div,
    motionProps: {
      initial: preset.initial,
      animate: preset.animate,
      exit: preset.exit,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
  }
}
