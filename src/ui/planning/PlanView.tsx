'use client'

import React, { Dispatch, SetStateAction } from 'react'
import type {
  WeeklyPlan,
  Representative,
  RepresentativeId,
  DayInfo,
  ShiftType,
  ISODate,
} from '../../domain/types'
import { VariableSizeList as List } from 'react-window'
import { PlanRow } from './PlanRow'
import { PlannerAssignmentsMap } from '@/application/ui-adapters/getEffectiveAssignmentsForPlanner'
import {
  HEADER_HEIGHT,
  ROW_HEIGHT,
  PLANNER_WIDTHS,
} from './constants'



interface PlanViewProps {
  weeklyPlan: WeeklyPlan
  weekDays: DayInfo[]
  agents: Representative[]
  activeShift: ShiftType
  assignmentsMap: PlannerAssignmentsMap
  onCellClick: (repId: string, date: ISODate) => Promise<void>
  onCellContextMenu: (repId: string, date: ISODate, e: React.MouseEvent) => void
  onEditDay: Dispatch<SetStateAction<DayInfo | null>>
}

function Row({
  index,
  style,
  data,
}: {
  index: number
  style: React.CSSProperties
  data: {
    agents: Representative[]
    weeklyPlan: WeeklyPlan
    weekDays: DayInfo[]
    activeShift: ShiftType
    assignmentsMap: PlannerAssignmentsMap
    onCellClick: (repId: string, date: ISODate) => Promise<void>
    onCellContextMenu: (repId: string, date: ISODate, e: React.MouseEvent) => void
  }
}) {
  const { agents, weeklyPlan, weekDays, activeShift, assignmentsMap, onCellClick, onCellContextMenu } = data
  const agent = agents[index]

  if (!agent) return null


  return (
    <div style={style}>
      <PlanRow
        agent={agent}
        weeklyPlan={weeklyPlan}
        weekDays={weekDays}
        activeShift={activeShift}
        assignmentsMap={assignmentsMap}
        isAlternate={index % 2 !== 0} // Zebra by row (agent)
        onCellClick={onCellClick}
        onCellContextMenu={onCellContextMenu}
      />
    </div>
  )
}

export function PlanView({
  weeklyPlan,
  weekDays,
  agents,
  activeShift,
  assignmentsMap,
  onCellClick,
  onCellContextMenu,
  onEditDay,
}: PlanViewProps) {
  const itemData = React.useMemo(
    () => ({
      agents,
      weeklyPlan,
      weekDays,
      activeShift,
      assignmentsMap,
      onCellClick,
      onCellContextMenu,
    }),
    [agents, weeklyPlan, weekDays, activeShift, assignmentsMap, onCellClick, onCellContextMenu]
  )

  return (
    <div style={{ height: 'calc(100vh - 280px)', width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${PLANNER_WIDTHS.AGENT_NAME}px repeat(7, 1fr)`,
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '10px',
          fontWeight: 600,
          background: '#f9fafb',
          color: '#374151',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ paddingLeft: '16px' }}>Agente</div>
        {weekDays.map(day => (
          <div
            key={day.date}
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              color: day.isSpecial ? '#b45309' : 'inherit',
            }}
            onClick={() => onEditDay(day)}
          >
            <div>{new Date(day.date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
            <div style={{ fontSize: '12px', fontWeight: 400 }}>
              {day.date.split('-')[2]}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 'calc(100% - ${HEADER_HEIGHT}px)', width: '100%', overflow: 'auto' }}>
        <List
          height={typeof window !== 'undefined' ? window.innerHeight - 280 - HEADER_HEIGHT : 600}
          itemCount={agents.length}
          itemSize={() => ROW_HEIGHT}
          width={'100%'}
          itemData={itemData}
        >
          {Row}
        </List>
      </div>
    </div>
  )
}
