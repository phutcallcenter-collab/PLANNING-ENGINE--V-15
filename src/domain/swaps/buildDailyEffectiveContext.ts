/**
 * 🎯 BUILDER DE CONTEXTO EFECTIVO PARA VALIDACIÓN DE SWAPS
 * 
 * Esta es la ÚNICA fuente de verdad para el estado efectivo de un día.
 * Combina: plan base → incidencias → swaps existentes
 * 
 * PRINCIPIO:
 * La validación de swaps debe operar sobre el estado EFECTIVO,
 * no sobre el estado base. Este builder garantiza eso.
 */

import { ISODate, WeeklyPlan, SwapEvent, Incident, Representative, ShiftType, RepresentativeId } from '../types'
import { resolveIncidentDates } from '../incidents/resolveIncidentDates'
import { DayInfo } from '../calendar/types'
import { getEffectiveAssignmentForDay } from '../planning/getEffectiveAssignmentForDay'

/**
 * Contexto efectivo para validación de swaps.
 * 
 * - effectiveShifts: Turnos que la persona REALMENTE trabaja ese día (después de swaps)
 * - baseShifts: Turnos que la persona tiene en el plan base (antes de swaps)
 * - isBlocked: Si está bloqueado por VACACIONES/LICENCIA
 */
export interface EffectiveSwapContext {
    daily: Record<
        RepresentativeId,
        {
            effectiveShifts: Set<ShiftType>
            baseShifts: Set<ShiftType>
            isBlocked: boolean
        }
    >
}

/**
 * Construye el contexto efectivo para un día específico.
 * 
 * Este es el punto de entrada ÚNICO para obtener el estado real de un día.
 * Cualquier validación de swaps DEBE usar este contexto.
 */
export function buildDailyEffectiveContext(params: {
    date: ISODate
    weeklyPlan: WeeklyPlan
    swaps: SwapEvent[]
    incidents: Incident[]
    allCalendarDays: DayInfo[]
    representatives: Representative[]
}): EffectiveSwapContext {
    const { date, weeklyPlan, swaps, incidents, allCalendarDays, representatives } = params

    const context: EffectiveSwapContext = { daily: {} }

    // Filtrar swaps del día
    const daySwaps = swaps.filter(s => s.date === date)

    for (const agent of weeklyPlan.agents) {
        const repId = agent.representativeId
        const day = agent.days[date]
        const assignment = day?.assignment

        // 1. Determinar turnos BASE (del plan, antes de swaps)
        const baseShifts = new Set<ShiftType>()
        if (assignment) {
            if (assignment.type === 'SINGLE') {
                baseShifts.add(assignment.shift)
            } else if (assignment.type === 'BOTH') {
                baseShifts.add('DAY')
                baseShifts.add('NIGHT')
            }
        }

        // 2. Verificar bloqueos (VACACIONES/LICENCIA)
        const rep = representatives.find(r => r.id === repId)
        const blockingIncident = incidents.find(i => {
            if (i.representativeId !== repId) return false
            if (!['VACACIONES', 'LICENCIA'].includes(i.type)) return false

            const resolved = resolveIncidentDates(i, allCalendarDays, rep)
            return resolved.dates.includes(date)
        })

        const isBlocked = !!blockingIncident

        // 3. Calcular turnos EFECTIVOS (después de aplicar swaps)
        const effectiveShifts = new Set<ShiftType>()

        if (!isBlocked) {
            // Empezar con los turnos base
            const currentShifts = new Set(baseShifts)

            // Aplicar cada swap del día
            for (const swap of daySwaps) {
                if (swap.type === 'COVER') {
                    // fromRep deja de trabajar ese turno
                    if (swap.fromRepresentativeId === repId && currentShifts.has(swap.shift)) {
                        currentShifts.delete(swap.shift)
                    }
                    // toRep empieza a trabajar ese turno
                    if (swap.toRepresentativeId === repId) {
                        currentShifts.add(swap.shift)
                    }
                } else if (swap.type === 'DOUBLE') {
                    // El rep trabaja turno adicional
                    if (swap.representativeId === repId) {
                        currentShifts.add(swap.shift)
                    }
                } else if (swap.type === 'SWAP') {
                    // Intercambio de turnos
                    if (swap.fromRepresentativeId === repId) {
                        if (currentShifts.has(swap.fromShift)) {
                            currentShifts.delete(swap.fromShift)
                            currentShifts.add(swap.toShift)
                        }
                    }
                    if (swap.toRepresentativeId === repId) {
                        if (currentShifts.has(swap.toShift)) {
                            currentShifts.delete(swap.toShift)
                            currentShifts.add(swap.fromShift)
                        }
                    }
                }
            }

            // Los turnos efectivos son los que quedaron después de aplicar swaps
            currentShifts.forEach(shift => effectiveShifts.add(shift))
        }

        context.daily[repId] = {
            effectiveShifts,
            baseShifts,
            isBlocked,
        }
    }

    return context
}
