import { PlanningBaseState } from '@/domain/types'

export type BackupPayload = PlanningBaseState & {
  exportedAt: string
  appVersion: number
}
