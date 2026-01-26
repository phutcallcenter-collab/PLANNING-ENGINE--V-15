'use client'

import React from 'react'
import type {
  Representative,
  DayInfo,
  DailyPresence,
  RepresentativeId,
  ISODate,
  ShiftType,
  WeeklyPlan,
} from '../../domain/types'
import { PlanCell } from './PlanCell'
import { PlannerAssignmentsMap } from '@/application/ui-adapters/getEffectiveAssignmentsForPlanner'
import { mapEffectiveDutyToCellState } from '@/application/ui-adapters/mapEffectiveDutyToCellState'
import { PLANNER_WIDTHS } from './constants'
import { useAppStore } from '@/store/useAppStore'
import { CellBadge } from '@/application/ui-adapters/cellState'

interface PlanRowProps {
  agent: Representative
  weeklyPlan: WeeklyPlan // Kept but might be unused if we rely fully on map
  weekDays: DayInfo[]
  activeShift: ShiftType
  assignmentsMap: PlannerAssignmentsMap
  isAlternate?: boolean
  onCellClick: (repId: string, date: ISODate) => void
  onCellContextMenu: (repId: string, date: ISODate, e: React.MouseEvent) => void
}

export const PlanRow = React.memo(function PlanRow({
  agent,
  weeklyPlan,
  weekDays,
  activeShift,
  assignmentsMap,
  isAlternate,
  onCellClick,
  onCellContextMenu,
}: PlanRowProps) {
  const { representatives } = useAppStore(s => ({
    representatives: s.representatives,
  }))

  // Find this agent's data in weeklyPlan
  const agentPlan = weeklyPlan.agents.find(a => a.representativeId === agent.id)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid #eee',
        minHeight: '45px',
        background: isAlternate ? '#f9fafb' : 'white', // Zebra Horizontal
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          fontWeight: 500,
          width: `${PLANNER_WIDTHS.AGENT_NAME}px`,
          minWidth: `${PLANNER_WIDTHS.AGENT_NAME}px`,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {agent.name}
      </div>
      <div style={{ flex: 1, display: 'flex', gap: '4px', paddingRight: '4px' }}>
        {weekDays.map((day) => {
          // Lookup effective duty from adapter map
          const effectiveDuty = assignmentsMap[agent.id]?.[day.date]?.[activeShift]

          // 🔄 Extract badge and coverage context from weeklyPlan (DailyPresence)
          const dayData = agentPlan?.days[day.date]
          const badge = dayData?.badge

          // 🔄 NEW: Build coverage info for tooltip
          const coverageInfo = dayData?.coverageContext ? {
            coveredByName: dayData.coverageContext.coveredByRepId
              ? representatives.find(r => r.id === dayData.coverageContext!.coveredByRepId)?.name
              : undefined,
            coveringName: dayData.coverageContext.coveringRepId
              ? representatives.find(r => r.id === dayData.coverageContext!.coveringRepId)?.name
              : undefined,
          } : undefined

          // 🧠 MAPPER: Convert domain state to UI-ready state
          const resolvedCell = mapEffectiveDutyToCellState(
            effectiveDuty,
            day,
            agent,
            representatives,
            badge, // 👈 Pass badge from domain
            coverageInfo // 👈 Pass coverage names for tooltip
          )

          return (
            <PlanCell
              key={day.date}
              resolved={resolvedCell}
              repId={agent.id}
              date={day.date}
              onClick={() => onCellClick(agent.id, day.date)}
              onContextMenu={(e) => onCellContextMenu(agent.id, day.date, e)}
            />
          )
        })}
      </div>
    </div>
  )
})
