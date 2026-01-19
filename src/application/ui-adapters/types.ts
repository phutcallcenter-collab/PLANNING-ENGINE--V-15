import { ManagerDuty } from '@/domain/management/types'

export type EffectiveManagerDay =
    | { kind: 'VACATION'; note?: string }
    | { kind: 'LICENSE'; note?: string }
    | { kind: 'DUTY'; duty: ManagerDuty; note?: string }
    | { kind: 'OFF'; note?: string }
    | { kind: 'EMPTY'; note?: string }

export type ManagerVisualState =
    | 'DAY'
    | 'NIGHT'
    | 'INTER'
    | 'MONITOR'
    | 'OFF'
    | 'VACACIONES'
    | 'LICENCIA'
    | 'AUS_JUST'
    | 'AUS_UNJUST'
    | 'EMPTY'
