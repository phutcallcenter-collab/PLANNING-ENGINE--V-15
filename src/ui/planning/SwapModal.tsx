// ... imports ...
import { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useCoverageStore } from '@/store/useCoverageStore'
import { useEditMode } from '@/hooks/useEditMode'
import { ISODate, ShiftType, SwapEvent, SwapType, WeeklyPlan } from '@/domain/types'
import {
  Sun,
  Moon,
  Shield,
  ArrowLeftRight,
  Copy,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'
import {
  validateSwapOperation,
} from '@/domain/swaps/validateSwapOperation'
import {
  buildDailyEffectiveContext,
  EffectiveSwapContext,
} from '@/domain/swaps/buildDailyEffectiveContext'
import { repName } from '@/application/presenters/humanize'

interface SwapModalProps {
  weeklyPlan: WeeklyPlan // 🎯 Plan viene de arriba, no se carga aquí
  initialDate?: ISODate
  initialShift?: ShiftType
  initialRepId?: string
  existingSwap?: SwapEvent
  onClose: () => void
}

export function SwapModal({
  weeklyPlan,
  initialDate,
  initialShift,
  initialRepId,
  existingSwap,
  onClose,
}: SwapModalProps) {
  const {
    representatives,
    addSwap,
    planningAnchorDate,
    incidents,
    allCalendarDaysForRelevantMonths,
    removeSwap,
    addHistoryEvent,
    swaps,
  } = useAppStore(s => ({
    representatives: s.representatives,
    addSwap: s.addSwap,
    planningAnchorDate: s.planningAnchorDate,
    incidents: s.incidents,
    allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
    removeSwap: s.removeSwap,
    addHistoryEvent: s.addHistoryEvent,
    swaps: s.swaps,
  }))

  // 🔄 NEW: Coverage store
  const { createCoverage } = useCoverageStore()

  const { mode } = useEditMode()
  const [date, setDate] = useState<ISODate>(initialDate || planningAnchorDate)
  const [activeTab, setActiveTab] = useState<'SWAP' | 'COVER' | 'FREE' | 'COBERTURA'>( // 🔄 NEW: Add COBERTURA
    'COBERTURA' // 🔄 NEW: Default to COBERTURA
  )
  const [shift, setShift] = useState<ShiftType>(initialShift || 'DAY')

  // 🎯 CAMBIO CRÍTICO: Delegar construcción de contexto al dominio
  // El modal ya NO construye el contexto manualmente
  // El dominio provee la verdad (estado efectivo incluyendo swaps existentes)
  const validationContext = useMemo((): EffectiveSwapContext => {
    if (!weeklyPlan) return { daily: {} }

    return buildDailyEffectiveContext({
      date,
      weeklyPlan,
      swaps,  // ← CRÍTICO: incluir swaps existentes para detectar doble cobertura
      incidents,
      allCalendarDays: allCalendarDaysForRelevantMonths,
      representatives,
    })
  }, [
    date,
    weeklyPlan,
    swaps,  // ← NUEVO: dependencia crítica
    incidents,
    allCalendarDaysForRelevantMonths,
    representatives,
  ])

  const [type, setType] = useState<SwapType>(existingSwap?.type || 'COVER')
  const [fromId, setFromId] = useState<string>(initialRepId || (existingSwap && 'fromRepresentativeId' in existingSwap ? existingSwap.fromRepresentativeId : '') || '')
  const [toId, setToId] = useState<string>((existingSwap && 'toRepresentativeId' in existingSwap ? existingSwap.toRepresentativeId : (existingSwap && 'representativeId' in existingSwap ? existingSwap.representativeId : '')) || '')
  const [note, setNote] = useState(existingSwap?.note || '')

  const effectiveShift = useMemo(() => {
    if (type === 'COVER' && fromId && validationContext.daily[fromId]) {
      const day = validationContext.daily[fromId]
      // Detectar turno del plan base
      const baseShifts = Array.from(day.baseShifts)
      if (baseShifts.length === 1) {
        return baseShifts[0]
      }
    }
    return shift
  }, [type, fromId, shift, validationContext])

  const validationError = useMemo(() => {
    if (!type || !date) return null
    return validateSwapOperation(type, fromId, toId, effectiveShift, validationContext)
  }, [type, fromId, toId, date, effectiveShift, validationContext])

  const canSubmit = useMemo(() => {
    if (validationError) return false

    // 🔄 NEW: COBERTURA validation
    if (activeTab === 'COBERTURA') return !!(fromId && toId && date)

    if (type === 'COVER' || type === 'SWAP') return !!(fromId && toId && date)
    if (type === 'DOUBLE') return !!(toId && date)
    return false
  }, [type, fromId, toId, validationError, date, activeTab])

  const previewText = useMemo(() => {
    if (!canSubmit || (!fromId && type !== 'DOUBLE' && activeTab !== 'COBERTURA') || !toId) return null
    const fromName = repName(representatives, fromId)
    const toName = repName(representatives, toId)

    // 🔄 NEW: COBERTURA preview
    if (activeTab === 'COBERTURA') {
      const shiftName = effectiveShift === 'DAY' ? 'Día' : 'Noche'
      return (
        <>
          <strong>{toName}</strong> cubrirá el turno <strong>{shiftName}</strong>{' '}
          de <strong>{fromName}</strong>.
          <br />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            ✅ Este cambio solo proyecta badges, no mueve personas entre turnos.
          </span>
        </>
      )
    }

    if (type === 'COVER') {
      const shiftName = effectiveShift === 'DAY' ? 'Día' : 'Noche'
      return (
        <>
          <strong>{toName}</strong> cubrirá el turno <strong>{shiftName}</strong>{' '}
          de <strong>{fromName}</strong>.
          <br />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Este cambio aplica para el día seleccionado.
          </span>
        </>
      )
    }
    if (type === 'SWAP') {
      const fromShifts = validationContext.daily[fromId!]?.effectiveShifts
      const toShifts = validationContext.daily[toId]?.effectiveShifts

      if (fromShifts && toShifts && fromShifts.size === 1 && toShifts.size === 1) {
        const fromShift = Array.from(fromShifts)[0]
        const toShift = Array.from(toShifts)[0]
        return (
          <>
            <strong>{fromName}</strong> (Turno {fromShift}) y <strong>{toName}</strong> (Turno {toShift}) intercambian sus turnos.
          </>
        )
      }
      return 'Intercambio de turnos.'
    }
    if (type === 'DOUBLE') {
      const shiftName = shift === 'DAY' ? 'Día' : 'Noche'
      return (
        <>
          <strong>{toName}</strong> hará un turno DOBLE en{' '}
          <strong>{shiftName}</strong>.
          <br />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Se cuenta como +1 en la cobertura.
          </span>
        </>
      )
    }
    return null
  }, [type, fromId, toId, canSubmit, shift, effectiveShift, validationContext, representatives])

  const getSwapDescription = () => {
    if (!existingSwap) return ''
    if (existingSwap.type === 'COVER') {
      const fromName = repName(representatives, existingSwap.fromRepresentativeId)
      const toName = repName(representatives, existingSwap.toRepresentativeId)
      const shiftName = existingSwap.shift === 'DAY' ? 'Día' : 'Noche'
      return `${toName} está cubriendo el turno ${shiftName} de ${fromName}`
    }
    if (existingSwap.type === 'DOUBLE') {
      const personName = repName(representatives, existingSwap.representativeId)
      const shiftName = existingSwap.shift === 'DAY' ? 'Día' : 'Noche'
      return `${personName} tiene un turno doble en ${shiftName}`
    }
    if (existingSwap.type === 'SWAP') {
      const fromName = repName(representatives, existingSwap.fromRepresentativeId)
      const toName = repName(representatives, existingSwap.toRepresentativeId)
      return `${fromName} y ${toName} intercambiaron turnos`
    }
    return ''
  }

  const handleDeleteSwap = () => {
    if (!existingSwap) return;
    removeSwap(existingSwap.id);
    addHistoryEvent({
      category: 'PLANNING',
      title: 'Cambio de turno eliminado',
      description: getSwapDescription(),
    });
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit || (!fromId && type !== 'DOUBLE')) return

    // 🔄 NEW: Handle COBERTURA type using Coverage store
    if (activeTab === 'COBERTURA' && fromId && toId) {
      createCoverage({
        date,
        shift: effectiveShift,
        coveredRepId: fromId,
        coveringRepId: toId,
        note,
      })

      addHistoryEvent({
        category: 'PLANNING',
        title: 'Cobertura creada',
        description: `${repName(representatives, toId)} cubrirá el turno ${effectiveShift === 'DAY' ? 'Día' : 'Noche'} de ${repName(representatives, fromId)}`,
      })

      onClose()
      return
    }

    if (type === 'COVER' && fromId) {
      addSwap({
        type: 'COVER',
        date,
        shift: effectiveShift,
        fromRepresentativeId: fromId,
        toRepresentativeId: toId,
        note,
      } as any)
    } else if (type === 'DOUBLE' && toId) {
      addSwap({
        type: 'DOUBLE',
        date,
        shift,
        representativeId: toId,
        note,
      } as any)
    } else if (type === 'SWAP' && fromId && toId) {
      const fromShifts = validationContext.daily[fromId]?.effectiveShifts
      const toShifts = validationContext.daily[toId]?.effectiveShifts
      if (fromShifts && toShifts && fromShifts.size === 1 && toShifts.size === 1) {
        const fromShift = Array.from(fromShifts)[0]
        const toShift = Array.from(toShifts)[0]
        addSwap({
          type: 'SWAP',
          date,
          fromRepresentativeId: fromId,
          fromShift,
          toRepresentativeId: toId,
          toShift,
          note,
        } as any)
      }
    }
    onClose()
  }

  // --- Render ---
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
  }

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '500px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  }

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    padding: '16px 24px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  }

  const btnCloseStyle: React.CSSProperties = {
    color: '#9ca3af',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#111827',
                margin: 0,
              }}
            >
              Gestión de Cobertura
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              {/* Selector de Fecha */}
              <input
                type="date"
                style={{
                  fontSize: '13px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#374151',
                }}
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={!!existingSwap}
              />
              {/* Selector de Turno */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShift('DAY')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border:
                      shift === 'DAY'
                        ? '1px solid #fcd34d'
                        : '1px solid #e5e7eb',
                    backgroundColor: shift === 'DAY' ? '#fffbeb' : 'white',
                    color: shift === 'DAY' ? '#b45309' : '#6b7280',
                    pointerEvents: existingSwap ? 'none' : 'auto',
                    opacity: existingSwap ? 0.7 : 1,
                  }}
                >
                  <Sun size={12} /> Día
                </button>
                <button
                  onClick={() => setShift('NIGHT')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border:
                      shift === 'NIGHT'
                        ? '1px solid #c7d2fe'
                        : '1px solid #e5e7eb',
                    backgroundColor: shift === 'NIGHT' ? '#eef2ff' : 'white',
                    color: shift === 'NIGHT' ? '#4338ca' : '#6b7280',
                    pointerEvents: existingSwap ? 'none' : 'auto',
                    opacity: existingSwap ? 0.7 : 1,
                  }}
                >
                  <Moon size={12} /> Noche
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={btnCloseStyle}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {existingSwap ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertTriangle size={24} color="#b45309" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#92400e' }}>
                    Cambio de turno activo
                  </div>
                  <div style={{ fontSize: '14px', color: '#78350f', marginTop: '4px' }}>
                    {getSwapDescription()}
                  </div>
                  {existingSwap.note && (
                    <div style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '8px', color: '#78350f' }}>
                      Nota: {existingSwap.note}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                Si eliminas este cambio, la celda volverá a su estado original según el plan base (WORKING u OFF).
              </div>
            </div>
          ) : (
            <>
              {/* Type Selectors */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr', // 🔄 Back to 3 columns
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <TypeCard
                  active={activeTab === 'COBERTURA'}
                  onClick={() => setActiveTab('COBERTURA')}
                  icon={Shield} // 🔄 Changed to Shield icon
                  label="Cubrir" // 🔄 Renamed from "Cobertura"
                  color="blue" // 🔄 Changed to blue
                />
                <TypeCard
                  active={type === 'SWAP'}
                  onClick={() => setType('SWAP')}
                  icon={ArrowLeftRight}
                  label="Intercambio"
                  color="green"
                />
                <TypeCard
                  active={type === 'DOUBLE'}
                  onClick={() => setType('DOUBLE')}
                  icon={Copy}
                  label="Doble"
                  color="orange"
                />
              </div>

              {/* Dynamic Fields */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {type !== 'DOUBLE' && (
                  <div>
                    <label style={labelStyle}>
                      {type === 'SWAP'
                        ? 'Quién cede (Origen)'
                        : 'Quién necesita cobertura'}
                    </label>
                    <select
                      style={inputStyle}
                      value={fromId}
                      onChange={e => setFromId(e.target.value)}
                    >
                      <option value="">Seleccionar representante...</option>
                      {representatives.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {/* Indicador de turno para COVER */}
                    {type === 'COVER' &&
                      fromId &&
                      validationContext.daily[fromId] && (
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {effectiveShift === 'DAY' ? (
                            <Sun size={14} />
                          ) : (
                            <Moon size={14} />
                          )}
                          <span>
                            Turno a cubrir:{' '}
                            <strong>
                              {effectiveShift === 'DAY' ? 'Día' : 'Noche'}
                            </strong>
                          </span>
                        </div>
                      )}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>
                    {type === 'DOUBLE'
                      ? 'Quién hará el doble turno'
                      : type === 'SWAP'
                        ? 'Con quién intercambia'
                        : 'Quién va a cubrir'}
                  </label>
                  <select
                    style={inputStyle}
                    value={toId}
                    onChange={e => setToId(e.target.value)}
                  >
                    <option value="">Seleccionar representante...</option>
                    {representatives.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview / Validation Box */}
              {previewText && !validationError && (
                <div
                  style={{
                    marginBottom: '24px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <CheckCircle2
                    color="#16a34a"
                    size={18}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#374151',
                      lineHeight: '1.5',
                    }}
                  >
                    {previewText}
                  </div>
                </div>
              )}

              {validationError && (
                <div
                  style={{
                    marginBottom: '24px',
                    padding: '16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertTriangle
                    color="#ef4444"
                    size={18}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  <div
                    style={{ fontSize: '14px', color: '#b91c1c', fontWeight: 500 }}
                  >
                    {validationError}
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label style={labelStyle}>Nota Adicional (Opcional)</label>
                <input
                  style={inputStyle}
                  placeholder="Ej: Cambio autorizado por jefe de guardia..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </>
          )}
        </div>


        {/* Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #f3f4f6',
            backgroundColor: '#f9fafb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {existingSwap ? (
            <>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Esta acción no se puede deshacer.
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#4b5563',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                {mode === 'ADMIN_OVERRIDE' && (
                  <button
                    onClick={handleDeleteSwap}
                    style={{
                      padding: '8px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'white',
                      backgroundColor: '#dc2626',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar Cambio
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Los cambios afectan solo a este día.
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#4b5563',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: canSubmit ? '#2563eb' : '#d1d5db',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    boxShadow: canSubmit ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Confirmar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TypeCard({ active, onClick, icon: Icon, label, color }: any) {
  const getColorStyles = (c: string, isActive: boolean) => {
    if (!isActive)
      return {
        backgroundColor: 'white',
        borderColor: '#e5e7eb',
        color: '#4b5563',
      }

    switch (c) {
      case 'purple': // 🔄 NEW: Purple for COBERTURA
        return {
          backgroundColor: '#f3e8ff',
          borderColor: '#d8b4fe',
          color: '#7c3aed',
        }
      case 'blue':
        return {
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          color: '#1d4ed8',
        }
      case 'green':
        return {
          backgroundColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          color: '#15803d',
        }
      case 'orange':
        return {
          backgroundColor: '#fff7ed',
          borderColor: '#fed7aa',
          color: '#c2410c',
        }
      default:
        return {}
    }
  }

  const styles = getColorStyles(color, active)

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        borderRadius: '12px',
        border: `1px solid ${styles.borderColor}`,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        cursor: 'pointer',
        transition: 'all 0.2s',
        width: '100%',
      }}
    >
      <Icon size={24} style={{ color: active ? 'inherit' : '#9ca3af' }} strokeWidth={1.5} />
      <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
    </button>
  )
}
