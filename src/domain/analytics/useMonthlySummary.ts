import { useMemo } from 'react'
import { computeMonthlySummary } from './computeMonthlySummary'
import { useAppStore } from '@/store/useAppStore'

export function useMonthlySummary(month: string) {
  const { incidents, representatives } = useAppStore(s => ({
    incidents: s.incidents,
    representatives: s.representatives,
  }))

  return useMemo(() => {
    if (!month || !incidents || !representatives) return null
    return computeMonthlySummary(incidents, month, representatives)
  }, [incidents, month, representatives])
}
