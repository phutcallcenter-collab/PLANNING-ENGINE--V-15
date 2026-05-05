'use client'

import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun, Target, Trophy } from 'lucide-react'
import {
  COMMERCIAL_GOAL_SEGMENTS,
  createCommercialGoalId,
} from '@/domain/commercialGoals/defaults'
import type {
  CommercialGoalSegment,
  ShiftType,
} from '@/domain/types'
import { generateMonthDays } from '@/domain/calendar/state'
import { useAppStore } from '@/store/useAppStore'
import { buildRepresentativePerformanceReport } from '@/ui/reports/analysis-beta/services/representative-performance.service'

const SHIFT_META: Record<
  ShiftType,
  { label: string; icon: typeof Sun; accent: string; tint: string; border: string }
> = {
  DAY: {
    label: 'Turno Día',
    icon: Sun,
    accent: '#2563eb',
    tint: 'rgba(239, 246, 255, 0.95)',
    border: 'rgba(37, 99, 235, 0.18)',
  },
  NIGHT: {
    label: 'Turno Noche',
    icon: Moon,
    accent: '#7c3aed',
    tint: 'rgba(245, 243, 255, 0.95)',
    border: 'rgba(124, 58, 237, 0.18)',
  },
}

const SEGMENT_LABELS: Record<CommercialGoalSegment, string> = {
  PART_TIME: 'Part Time',
  FULL_TIME: 'Full Time',
  MIXTO: 'Mixto',
}

function formatGoalValue(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function CommercialGoalsManagement() {
  const {
    commercialGoals,
    upsertCommercialGoal,
    representatives,
    incidents,
    calendar,
    specialSchedules,
    planningAnchorDate,
  } = useAppStore(state => ({
    commercialGoals: state.commercialGoals ?? [],
    upsertCommercialGoal: state.upsertCommercialGoal,
    representatives: state.representatives ?? [],
    incidents: state.incidents ?? [],
    calendar: state.calendar,
    specialSchedules: state.specialSchedules ?? [],
    planningAnchorDate: state.planningAnchorDate,
  }))
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})

  useEffect(() => {
    setDraftValues(
      Object.fromEntries(
        commercialGoals.map(goal => [goal.id, String(goal.monthlyTarget)])
      )
    )
  }, [commercialGoals])

  const totalsByShift = useMemo(() => {
    return commercialGoals.reduce<Record<ShiftType, number>>(
      (accumulator, goal) => {
        accumulator[goal.shift] += goal.monthlyTarget
        return accumulator
      },
      { DAY: 0, NIGHT: 0 }
    )
  }, [commercialGoals])

  const grandTotal = totalsByShift.DAY + totalsByShift.NIGHT
  const goalMonthKey = planningAnchorDate.slice(0, 7)
  const goalMonthDates = useMemo(() => {
    const [year, month] = goalMonthKey.split('-').map(Number)
    return generateMonthDays(year, month, calendar).map(day => day.date)
  }, [calendar, goalMonthKey])
  const realGoalReport = useMemo(
    () =>
      buildRepresentativePerformanceReport({
        representatives,
        commercialGoals,
        incidents,
        calendar,
        specialSchedules,
        currentPeriod: {
          kind: 'MONTH',
          anchorDate: `${goalMonthKey}-01`,
          label: goalMonthKey,
          from: `${goalMonthKey}-01`,
          to: goalMonthDates[goalMonthDates.length - 1] ?? `${goalMonthKey}-01`,
          loadedDays: goalMonthDates.length,
          expectedDays: goalMonthDates.length,
          loadedDates: goalMonthDates,
          isComplete: true,
        },
        currentTransactions: [],
        currentTransactionDates: goalMonthDates,
        manualRepresentativeLinks: [],
      }),
    [
      calendar,
      commercialGoals,
      goalMonthDates,
      goalMonthKey,
      incidents,
      representatives,
      specialSchedules,
    ]
  )
  const realTotalsByShift = useMemo(
    () => ({
      DAY: realGoalReport.shifts.DAY.groups.reduce(
        (total, group) => total + group.summary.target,
        0
      ),
      NIGHT: realGoalReport.shifts.NIGHT.groups.reduce(
        (total, group) => total + group.summary.target,
        0
      ),
    }),
    [realGoalReport]
  )
  const realGrandTotal = realGoalReport.globalSummary.target

  const handleDraftChange = (id: string, value: string) => {
    setDraftValues(current => ({
      ...current,
      [id]: value.replace(/[^\d]/g, ''),
    }))
  }

  const commitGoal = (shift: ShiftType, segment: CommercialGoalSegment) => {
    const id = createCommercialGoalId(shift, segment)
    const rawValue = draftValues[id] ?? '0'
    const monthlyTarget = Number.parseInt(rawValue || '0', 10)

    upsertCommercialGoal({
      shift,
      segment,
      monthlyTarget: Number.isFinite(monthlyTarget) ? monthlyTarget : 0,
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >
      <section
        style={{
          borderRadius: '22px',
          padding: '22px 24px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 52%, rgba(236,252,203,0.32) 100%)',
          boxShadow: '0 18px 44px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ maxWidth: '74ch' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#15803d',
              marginBottom: '10px',
            }}
          >
            Workspace comercial
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.55rem',
              lineHeight: 1.1,
              color: 'var(--text-main)',
            }}
          >
            Metas comerciales
          </h2>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '14px',
              color: 'var(--text-muted)',
              lineHeight: 1.65,
              maxWidth: '66ch',
            }}
          >
            Esta matriz guarda la meta mensual por representante para cada turno y
            segmento. El total real del bloque se calcula automáticamente con la
            planificación efectiva del mes y el total global sale de sumar todos
            los bloques reales.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          {([
            {
              label: 'Meta global real',
              value: formatGoalValue(realGrandTotal),
              note: `Resultado real para ${goalMonthKey} según roster planificado.`,
              icon: Trophy,
              accent: '#15803d',
              background: 'rgba(240, 253, 244, 0.98)',
              border: 'rgba(22, 163, 74, 0.18)',
            },
            {
              label: 'Turno día real',
              value: formatGoalValue(realTotalsByShift.DAY),
              note: 'Suma real de todos los bloques del turno día.',
              icon: Sun,
              accent: '#2563eb',
              background: 'rgba(239, 246, 255, 0.98)',
              border: 'rgba(37, 99, 235, 0.18)',
            },
            {
              label: 'Turno noche real',
              value: formatGoalValue(realTotalsByShift.NIGHT),
              note: 'Suma real de todos los bloques del turno noche.',
              icon: Moon,
              accent: '#7c3aed',
              background: 'rgba(245, 243, 255, 0.98)',
              border: 'rgba(124, 58, 237, 0.18)',
            },
            {
              label: 'Base por representante',
              value: formatGoalValue(grandTotal),
              note: 'Suma simple de las seis metas guardadas en la matriz.',
              icon: Target,
              accent: '#b45309',
              background: 'rgba(255, 251, 235, 0.98)',
              border: 'rgba(245, 158, 11, 0.2)',
            },
          ]).map(item => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                style={{
                  borderRadius: '16px',
                  border: `1px solid ${item.border}`,
                  background: item.background,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255, 255, 255, 0.88)',
                    color: item.accent,
                    border: `1px solid ${item.border}`,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '4px',
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: '1.12rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: '#64748b',
                    }}
                  >
                    {item.note}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section
        style={{
          borderRadius: '22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '0 18px 42px rgba(15, 23, 42, 0.05)',
          padding: '20px',
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        {(['DAY', 'NIGHT'] as const).map(shift => {
          const meta = SHIFT_META[shift]
          const Icon = meta.icon

          return (
            <article
              key={shift}
              style={{
                borderRadius: '20px',
                border: `1px solid ${meta.border}`,
                background: meta.tint,
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(255,255,255,0.88)',
                      color: meta.accent,
                      border: `1px solid ${meta.border}`,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: meta.accent,
                      }}
                    >
                      {meta.label}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        marginTop: '4px',
                      }}
                    >
                      Base guardada: {formatGoalValue(totalsByShift[shift])} · Real:{' '}
                      {formatGoalValue(realTotalsByShift[shift])}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '12px',
                }}
              >
                {COMMERCIAL_GOAL_SEGMENTS.map(segment => {
                  const id = createCommercialGoalId(shift, segment)
                  const goalValue = draftValues[id] ?? '0'
                  const realBlockTarget =
                    realGoalReport.shifts[shift].groups.find(group => group.segment === segment)
                      ?.summary.target ?? 0

                  return (
                    <label
                      key={id}
                      style={{
                        display: 'grid',
                        gap: '8px',
                        padding: '14px',
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.92)',
                        border: `1px solid ${meta.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                            }}
                          >
                            {SEGMENT_LABELS[segment]}
                          </div>
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '12px',
                              lineHeight: 1.55,
                              color: 'var(--text-muted)',
                            }}
                          >
                            Meta mensual por representante del bloque {SEGMENT_LABELS[segment].toLowerCase()} para el {meta.label.toLowerCase()}.
                          </div>
                          <div
                            style={{
                              marginTop: '6px',
                              fontSize: '11px',
                              lineHeight: 1.5,
                              color: meta.accent,
                              fontWeight: 700,
                            }}
                          >
                            Total real del bloque: {formatGoalValue(realBlockTarget)}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '6px 9px',
                            borderRadius: '999px',
                            background: 'rgba(248,250,252,0.9)',
                            border: '1px solid rgba(148, 163, 184, 0.18)',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          mensual
                        </span>
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={goalValue}
                        onChange={event => handleDraftChange(id, event.target.value)}
                        onBlur={() => commitGoal(shift, segment)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            commitGoal(shift, segment)
                          }
                        }}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: '1px solid rgba(148, 163, 184, 0.22)',
                          background: 'white',
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </label>
                  )
                })}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
