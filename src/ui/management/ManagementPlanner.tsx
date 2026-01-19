'use client'

import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useWeekNavigator } from '@/hooks/useWeekNavigator'
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan'

/**
 * 🧩 PLANNER GERENCIAL — Vista filtrada del planner operativo
 * 
 * PRINCIPIO:
 * - Gerencia = Representantes con role: 'MANAGER'
 * - Reusa TODO: WeeklyPlan, resolveEffectiveDuty, PlanCell, mappers
 * - Solo cambia: filtro de quién se muestra + labels visibles
 * 
 * NO HAY:
 * - ❌ Motor nuevo
 * - ❌ Estados nuevos
 * - ❌ Lógica paralela
 * - ❌ Validaciones especiales
 * 
 * SÍ HAY:
 * - ✅ Mismo WeeklyPlan
 * - ✅ Mismas incidencias (VACACIONES, LICENCIA)
 * - ✅ Mismos overrides
 * - ✅ Mismas celdas (PlanCell)
 */
export function ManagementPlanner() {
  const {
    representatives,
    planningAnchorDate,
    setPlanningAnchorDate,
  } = useAppStore(s => ({
    representatives: s.representatives,
    planningAnchorDate: s.planningAnchorDate,
    setPlanningAnchorDate: s.setPlanningAnchorDate,
  }))

  const { weekDays, label } = useWeekNavigator(
    planningAnchorDate,
    setPlanningAnchorDate
  )

  const { weeklyPlan } = useWeeklyPlan(weekDays)

  const managers = representatives.filter(
    r => r.role === 'MANAGER' && r.isActive !== false
  )

  if (!weeklyPlan) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          Horario Gerencial
        </h2>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          {label}
        </span>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px repeat(7, 1fr)',
        gap: '8px'
      }}>
        {/* Header row */}
        <div style={{ fontWeight: 600, padding: '8px' }}>Supervisor</div>
        {weekDays.map(d => (
          <div
            key={d.date}
            style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px',
            }}
          >
            {d.label}
          </div>
        ))}

        {/* Manager rows */}
        {managers.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '24px',
            color: '#9ca3af'
          }}>
            No hay gerentes activos
          </div>
        ) : (
          managers.map(manager => {
            const agentPlan = weeklyPlan.agents.find(a => a.representativeId === manager.id)

            return (
              <React.Fragment key={manager.id}>
                <div style={{ fontWeight: 600, padding: '8px' }}>{manager.name}</div>
                {weekDays.map(day => {
                  const assignment = agentPlan?.days[day.date]

                  return (
                    <div
                      key={day.date}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      {assignment?.assignment?.type === 'SINGLE' && assignment?.assignment?.shift}
                      {assignment?.assignment?.type === 'BOTH' && 'BOTH'}
                      {assignment?.assignment?.type === 'NONE' && 'OFF'}
                      {!assignment && '—'}
                    </div>
                  )
                })}
              </React.Fragment>
            )
          })
        )}
      </div>
    </div>
  )
}

