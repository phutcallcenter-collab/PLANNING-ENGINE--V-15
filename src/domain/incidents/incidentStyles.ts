import type { IncidentType } from './types'
import type { StatusVariant } from '../../ui/components/StatusPill'

export const INCIDENT_STYLES: Record<
  IncidentType,
  { label: string; variant: StatusVariant }
> = {
  TARDANZA: {
    label: 'Tardanza',
    variant: 'warning',
  },
  AUSENCIA: {
    label: 'Ausencia',
    variant: 'danger',
  },
  ERROR: {
    label: 'Error',
    variant: 'danger',
  },
  LICENCIA: {
    label: 'Licencia',
    variant: 'info',
  },
  VACACIONES: {
    label: 'Vacaciones',
    variant: 'ok',
  },
  OTRO: {
    label: 'Otro',
    variant: 'neutral',
  },
  OVERRIDE: {
    label: 'Cambio de Turno',
    variant: 'neutral',
  },
  SWAP: {
    label: 'Intercambio',
    variant: 'info',
  },
}
