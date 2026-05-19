import type { StateCreator } from 'zustand'
import { READ_ONLY_ACTION_MESSAGE } from '@/lib/access/access'
import type { EmploymentType, Representative } from '@/domain/types'
import { repName } from '@/application/presenters/humanizeStore'
import type { AppState } from './useAppStore'
import { canCurrentUserEditData } from './useAccessStore'

export type RepresentativeWorkloadSelection = EmploymentType | 'MIXTO'

export interface RepresentativeSlice {
  addRepresentative: (data: Omit<Representative, 'id' | 'isActive'>) => void
  updateRepresentative: (rep: Representative) => void
  bulkAssignEmploymentType: (
    representativeIds: string[],
    employmentType: RepresentativeWorkloadSelection
  ) => void
  deactivateRepresentative: (repId: string) => Promise<void>
  reactivateRepresentative: (repId: string) => Promise<void>
  reorderRepresentatives: (
    shift: 'DAY' | 'NIGHT',
    orderedIds: string[]
  ) => void
  normalizeOrderIndexes: (shift: 'DAY' | 'NIGHT') => void
}

export const createRepresentativeSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  RepresentativeSlice
> = (set, get) => ({
  addRepresentative: data => {
    if (!canCurrentUserEditData()) {
      console.warn('[Access] addRepresentative bloqueado:', READ_ONLY_ACTION_MESSAGE)
      return
    }

    set(state => {
      state.representatives.push({
        id: crypto.randomUUID(),
        ...data,
        commercialEligible: data.commercialEligible ?? true,
        isActive: true,
      })
    })
  },

  updateRepresentative: updatedRep => {
    if (!canCurrentUserEditData()) {
      console.warn('[Access] updateRepresentative bloqueado:', READ_ONLY_ACTION_MESSAGE)
      return
    }

    set(state => {
      const index = state.representatives.findIndex(
        representative => representative.id === updatedRep.id
      )

      if (index !== -1) {
        state.representatives[index] = {
          ...state.representatives[index],
          ...updatedRep,
        }
      }
    })
  },

  bulkAssignEmploymentType: (representativeIds, employmentType) => {
    if (!canCurrentUserEditData()) {
      console.warn(
        '[Access] bulkAssignEmploymentType bloqueado:',
        READ_ONLY_ACTION_MESSAGE
      )
      return
    }

    if (representativeIds.length === 0) {
      return
    }

    const uniqueIds = [...new Set(representativeIds)]

    set(state => {
      state.representatives.forEach(representative => {
        if (uniqueIds.includes(representative.id)) {
          if (employmentType === 'MIXTO') {
            representative.employmentType = representative.employmentType ?? 'FULL_TIME'
            representative.mixProfile = representative.mixProfile ?? { type: 'WEEKEND' }
            return
          }

          representative.employmentType = employmentType
          representative.mixProfile = undefined
        }
      })
    })

    const workloadLabel =
      employmentType === 'MIXTO'
        ? 'Mixto'
        : employmentType === 'PART_TIME'
          ? 'Part Time'
          : 'Full Time'

    get().addHistoryEvent({
      category: 'SETTINGS',
      title: 'Jornadas actualizadas por lote',
      description: `Se asignó ${workloadLabel} a ${uniqueIds.length} representante(s).`,
    })
  },

  deactivateRepresentative: async repId => {
    if (!canCurrentUserEditData()) {
      return
    }

    const { showConfirm, representatives, normalizeOrderIndexes } = get()
    const representativeName = repName(representatives, repId)
    const representative = representatives.find(rep => rep.id === repId)

    const confirmed = await showConfirm({
      title: '¿Desactivar Representante?',
      description: `Estás a punto de desactivar a ${representativeName}. No aparecerá en los nuevos planes, pero su historial se conservará. ¿Estás seguro?`,
      intent: 'warning',
      confirmLabel: 'Sí, desactivar',
    })

    if (!confirmed) return

    set(state => {
      const index = state.representatives.findIndex(rep => rep.id === repId)
      if (index !== -1) {
        state.representatives[index].isActive = false
      }
    })

    if (representative?.baseShift) {
      normalizeOrderIndexes(representative.baseShift)
    }
  },

  reactivateRepresentative: async repId => {
    if (!canCurrentUserEditData()) {
      return
    }

    const { showConfirm, representatives, normalizeOrderIndexes } = get()
    const representative = representatives.find(rep => rep.id === repId)

    if (!representative || representative.isActive) {
      return
    }

    const confirmed = await showConfirm({
      title: '¿Reactivar Representante?',
      description: `Estás a punto de reactivar a ${representative.name}. Volverá a participar en nuevos planes y se ubicará al final del turno ${representative.baseShift === 'DAY' ? 'de dia' : 'de noche'}. ¿Deseas continuar?`,
      intent: 'info',
      confirmLabel: 'Sí, reactivar',
    })

    if (!confirmed) return

    set(state => {
      const targetRepresentative = state.representatives.find(rep => rep.id === repId)

      if (!targetRepresentative) {
        return
      }

      const highestOrderIndex = state.representatives
        .filter(
          rep =>
            rep.id !== repId &&
            rep.baseShift === targetRepresentative.baseShift &&
            rep.isActive
        )
        .reduce((highest, rep) => Math.max(highest, rep.orderIndex ?? -1), -1)

      targetRepresentative.isActive = true
      targetRepresentative.orderIndex = highestOrderIndex + 1
    })

    normalizeOrderIndexes(representative.baseShift)
  },

  reorderRepresentatives: (shift, orderedIds) => {
    if (!canCurrentUserEditData()) {
      console.warn('[Access] reorderRepresentatives bloqueado:', READ_ONLY_ACTION_MESSAGE)
      return
    }

    set(state => {
      const representativesInShift = state.representatives.filter(
        representative =>
          representative.baseShift === shift && representative.isActive
      )

      if (orderedIds.length !== representativesInShift.length) {
        console.warn(
          '⚠️ Orden incompleto ignorado. Esperado:',
          representativesInShift.length,
          'Recibido:',
          orderedIds.length
        )
        return
      }

      orderedIds.forEach((id, index) => {
        const representative = state.representatives.find(rep => rep.id === id)
        if (representative && representative.baseShift === shift) {
          representative.orderIndex = index
        }
      })
    })

    get().addHistoryEvent({
      category: 'SETTINGS',
      title: `Orden de ${shift === 'DAY' ? 'Día' : 'Noche'} actualizado`,
      description: 'Se reordenaron los representantes del turno',
    })
  },

  normalizeOrderIndexes: shift => {
    if (!canCurrentUserEditData()) {
      console.warn('[Access] normalizeOrderIndexes bloqueado:', READ_ONLY_ACTION_MESSAGE)
      return
    }

    set(state => {
      const representativesInShift = state.representatives
        .filter(
          representative =>
            representative.baseShift === shift && representative.isActive
        )
        .sort((a, b) => a.orderIndex - b.orderIndex)

      representativesInShift.forEach((representative, index) => {
        representative.orderIndex = index
      })
    })
  },
})
