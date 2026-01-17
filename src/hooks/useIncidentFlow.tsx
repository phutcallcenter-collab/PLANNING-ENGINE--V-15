'use client'

import React from 'react'
import type { IncidentInput, Representative } from '../domain/types'
import { useToast } from '../ui/components/ToastProvider'
import { useAppStore } from '@/store/useAppStore'
import { canRegisterOnDate } from '@/domain/incidents/canRegisterOnDate'
import { format } from 'date-fns'

export function useIncidentFlow({ onSuccess }: { onSuccess: () => void }) {
  const addIncident = useAppStore(s => s.addIncident)
  const { showToast } = useToast()

  const submit = async (
    incidentInput: IncidentInput,
    representative: Representative
  ) => {
    if (!representative || !incidentInput) {
      showToast({
        title: 'Datos incompletos',
        message: 'Por favor, selecciona un representante y completa los datos.',
        type: 'error',
      })
      return
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    const dateRuleValidation = canRegisterOnDate(
      incidentInput.type,
      incidentInput.startDate,
      today
    )
    if (!dateRuleValidation.ok) {
      showToast({
        title: 'Acción no permitida',
        message: dateRuleValidation.message,
        type: 'error',
      })
      return
    }

    const result = await addIncident(incidentInput)

    if (result.ok) {
      onSuccess()
    } else {
       if (result.reason !== 'Acción cancelada por el usuario.') {
        showToast({
          title: 'Error de validación',
          message: result.reason || 'Ocurrió un error desconocido.',
          type: 'error',
        })
      }
    }
  }

  return {
    submit,
  }
}
