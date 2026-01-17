// src/ui/copy/tooltips.ts

export const TOOLTIPS = {
  coverage: {
    title: 'Cobertura del turno',
    description: (active: number, planned: number) =>
      `${active} de ${planned} personas planificadas están presentes.`,
  },
  absence: {
    title: 'Ausencia Registrada',
    description:
      'El colaborador no asistió. Esto impacta la cobertura y no se puede modificar desde la planificación.',
  },
  vacation: {
    title: 'Vacaciones',
    description:
      'Periodo de descanso. No se puede asignar trabajo durante estas fechas.',
  },
  license: {
    title: 'Licencia',
    description:
      'Ausencia justificada por causa médica o administrativa. No se puede modificar el plan.',
  },
  override: {
    title: 'Modificación Manual',
    description:
      'Este día fue alterado manualmente y no sigue la planificación base. Haz clic para revertir.',
  },
  base: {
    title: 'Estado Base',
    description:
      'Estado según el horario predefinido del representante. Haz clic para modificar.',
  },
  stats: {
    totalIncidents: 'Número total de eventos negativos registrados este mes (ausencias, tardanzas, errores).',
    totalDeductions: 'Suma de todos los puntos de penalización acumulados. Cada tipo de incidencia tiene un valor diferente.',
    absences: 'Cantidad de ausencias no justificadas. Es la incidencia de mayor impacto negativo.',
    peopleAtRisk: 'Número de empleados que han superado los umbrales de alerta definidos (p. ej., ≥3 tardanzas o ≥2 ausencias).',
  },
} as const
