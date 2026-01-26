'use client'

import React from 'react'
import type { IncidentInput, Representative } from '../domain/types'
import { useToast } from '../ui/components/ToastProvider'
import { useAppStore } from '@/store/useAppStore'
import { canRegisterOnDate } from '@/domain/incidents/canRegisterOnDate'
import { format } from 'date-fns'

export function useIncidentFlow({ onSuccess }: { onSuccess: (incidentId?: string) => void }) {
  const { addIncident, incidents } = useAppStore(s => ({
    addIncident: s.addIncident,
    incidents: s.incidents
  }))
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

    // ⚠️ Business Rule: Vacation Limit (14 days/year)
    // TODO: Extract logic to `validateVacationLimit`.
    // Mixing Business Rule (14 days), UX (confirm), and Mutation (appending note) is technical debt.
    // Also, replace `confirm()` with `showConfirm` (unified UI).
    if (incidentInput.type === 'VACACIONES') {
      const currentYear = new Date().getFullYear();
      const existingVacations = incidents.filter(i =>
        i.representativeId === representative.id &&
        i.type === 'VACACIONES' &&
        new Date(i.startDate).getFullYear() === currentYear
      );

      const usedDays = existingVacations.reduce((acc, curr) => acc + curr.duration, 0);
      const newDays = incidentInput.duration;

      if (usedDays + newDays > 14) {
        const message = `El representante ${representative.name} ya tiene ${usedDays} días de vacaciones este año.\n` +
          `Con esta solicitud sumará ${usedDays + newDays} días, excediendo el límite de 14.\n\n` +
          `¿Deseas registrar esto como una excepción?`;

        if (!confirm(message)) {
          return; // Abort if user cancels
        }

        // Append exception note
        incidentInput.note = (incidentInput.note ? incidentInput.note + ' ' : '') + '[Excepción: Límite anual excedido]';
      }
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
      onSuccess(result.newId)
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
