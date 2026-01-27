'use client'

import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useEditMode } from '@/hooks/useEditMode'
import {
  Representative,
  BaseSchedule,
  ShiftType,
  RepresentativeRole,
} from '@/domain/types'
import { createBaseSchedule } from '@/domain/state'
import { getRepresentativesByShift } from '@/domain/representatives/getRepresentativesByShift'
import { Plus, X, Sun, Moon } from 'lucide-react'
import { ShiftSection } from './components/ShiftSection'
import { Tooltip } from '../components/Tooltip'
import { HelpPanel } from '../components/HelpPanel'

const DayScheduleSelector = ({
  schedule,
  onChange,
}: {
  schedule: BaseSchedule
  onChange: (newSchedule: BaseSchedule) => void
}) => {
  const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {days.map((day, index) => {
        const isOff = schedule[index] === 'OFF'
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              const newSchedule = { ...schedule }
              newSchedule[index] =
                schedule[index] === 'WORKING' ? 'OFF' : 'WORKING'
              onChange(newSchedule)
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // OFF (selected) = gray, WORKING (not selected) = transparent
              background: isOff ? 'hsl(220, 10%, 92%)' : 'transparent',
              borderColor: isOff ? 'hsl(220, 10%, 75%)' : 'hsl(220, 15%, 88%)',
              color: isOff ? 'hsl(220, 15%, 25%)' : 'hsl(220, 15%, 35%)',
            }}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}

const RepresentativeForm = ({
  rep,
  onSave,
  onCancel,
}: {
  rep?: Representative
  onSave: (
    data: Omit<Representative, 'id' | 'isActive' | 'orderIndex'>,
    id?: string
  ) => void
  onCancel: () => void
}) => {
  const [name, setName] = useState(rep?.name || '')
  const [baseShift, setBaseShift] = useState<ShiftType>(rep?.baseShift || 'DAY')
  const [role, setRole] = useState<RepresentativeRole>(rep?.role || 'SALES')
  const [baseSchedule, setBaseSchedule] = useState<BaseSchedule>(
    rep?.baseSchedule || createBaseSchedule([1]) // Monday only (operational default)
  )
  const [mixProfile, setMixProfile] = useState<
    '' | 'WEEKDAY' | 'WEEKEND'
  >(rep?.mixProfile?.type || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const data: Omit<Representative, 'id' | 'isActive' | 'orderIndex'> = {
      name,
      baseShift,
      role,
      baseSchedule,
      mixProfile: mixProfile ? { type: mixProfile } : undefined,
    }
    onSave(data, rep?.id)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#f9fafb',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>
          {rep ? 'Editar Representante' : 'Nuevo Representante'}
        </h3>
        {rep && <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-main)' }}>
          Nombre Completo
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Ana García"
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-main)' }}>
            Rol
          </label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as RepresentativeRole)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--bg-panel)' }}
          >
            <option value="SALES">Ventas</option>
            <option value="CUSTOMER_SERVICE">Servicio al Cliente</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-main)' }}>
            Turno Base
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setBaseShift('DAY')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px solid', borderRadius: '6px', cursor: 'pointer', background: baseShift === 'DAY' ? '#fffbeb' : 'white', borderColor: baseShift === 'DAY' ? '#fcd34d' : '#d1d5db', color: baseShift === 'DAY' ? '#b45309' : '#374151' }}
            >
              <Sun size={16} /> Día
            </button>
            <button
              type="button"
              onClick={() => setBaseShift('NIGHT')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: '1px solid', borderRadius: '6px', cursor: 'pointer', background: baseShift === 'NIGHT' ? '#eef2ff' : 'white', borderColor: baseShift === 'NIGHT' ? '#c7d2fe' : '#d1d5db', color: baseShift === 'NIGHT' ? '#4338ca' : '#374151' }}
            >
              <Moon size={16} /> Noche
            </button>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-main)' }}>
            Patrón base de mixto
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: 0 }}>
            Se usa solo como referencia cuando no hay ajustes temporales. Los cambios especiales se configuran en Horarios Especiales.
          </p>
          <select
            value={mixProfile}
            onChange={e => setMixProfile(e.target.value as any)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--bg-panel)' }}
          >
            <option value="">Ninguno</option>
            <option value="WEEKDAY">Mixto entre semana (L-J) - base</option>
            <option value="WEEKEND">Mixto fin de semana (V-D) - base</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-main)' }}>
          Días Libres Base (semana)
        </label>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: 0 }}>
          Selecciona los días que el representante NO trabaja
        </p>
        <DayScheduleSelector schedule={baseSchedule} onChange={setBaseSchedule} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
        <button
          type="submit"
          style={{ padding: '8px 16px', background: '#111827', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> {rep ? 'Guardar Cambios' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}

export function RepresentativeManagement() {
  const { representatives: allReps, addRepresentative, updateRepresentative } =
    useAppStore(s => ({
      representatives: s.representatives ?? [],
      addRepresentative: s.addRepresentative,
      updateRepresentative: s.updateRepresentative,
    }))

  const { mode } = useEditMode() // 🔒 Usar modo de edición global
  const advancedEditMode = mode === 'ADMIN_OVERRIDE'

  const [editingRep, setEditingRep] = useState<Representative | null>(null)
  const [addingScheduleFor, setAddingScheduleFor] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false)
  const [activeShift, setActiveShift] = useState<ShiftType | 'ALL'>('DAY') // Iniciar en DAY

  const activeReps = useMemo(() => allReps.filter(r => r.isActive !== false), [allReps]);
  const inactiveReps = useMemo(() => allReps.filter(r => r.isActive === false), [allReps]);

  // Segmentar por turno usando el selector de dominio
  const dayReps = useMemo(() => getRepresentativesByShift(activeReps, 'DAY'), [activeReps])
  const nightReps = useMemo(() => getRepresentativesByShift(activeReps, 'NIGHT'), [activeReps])

  const handleSave = (data: Omit<Representative, 'id' | 'isActive' | 'orderIndex'>, id?: string) => {
    // ⚠️ UX: Explicit Confirmation for Operational Impact
    const message = id
      ? 'Editar un representante afecta la planificación histórica y futura.\n\n¿Estás seguro de que la información es correcta?'
      : 'Agregar un representante impactará los reportes y cobertura desde hoy.\n\n¿Estás seguro de continuar?'

    if (!confirm(message)) return

    if (id) {
      const existingRep = allReps.find(r => r.id === id);
      if (existingRep) {
        updateRepresentative({ ...existingRep, ...data });
      }
    } else {
      // Al agregar nuevo representante, asignar orderIndex al final del turno
      const repsInShift = activeReps.filter(r => r.baseShift === data.baseShift)
      const maxOrderIndex = repsInShift.length > 0
        ? Math.max(...repsInShift.map(r => r.orderIndex || 0))
        : -1
      addRepresentative({ ...data, orderIndex: maxOrderIndex + 1 } as any)
    }
    setEditingRep(null)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px', fontSize: '20px', color: 'var(--text-main)' }}>
          Gestión de Representantes
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Añade, edita o desactiva representantes. El orden determina el ranking del incentivo.
          </p>
          <HelpPanel
            title="¿Cómo agregar representantes?"
            points={[
              'Completa el formulario con nombre, rol y turno base',
              'Selecciona los días libres en el calendario semanal',
              'El representante aparecerá al final de su turno',
            ]}
          />
        </div>
      </div>

      {!editingRep && <RepresentativeForm
        onSave={handleSave}
        onCancel={() => setEditingRep(null)}
      />}

      {editingRep && <RepresentativeForm
        rep={editingRep}
        onSave={handleSave}
        onCancel={() => setEditingRep(null)}
      />}

      <div>
        {/* Tabs de segmentación */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          <Tooltip content="Vista de solo lectura. Selecciona un turno para reordenar">
            <button
              onClick={() => setActiveShift('ALL')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: activeShift === 'ALL' ? '2px solid #111827' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: activeShift === 'ALL' ? 600 : 400,
                color: activeShift === 'ALL' ? '#111827' : '#6b7280',
                fontSize: '14px',
              }}
            >
              Todos ({activeReps.length})
            </button>
          </Tooltip>
          <button
            onClick={() => setActiveShift('DAY')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeShift === 'DAY' ? '2px solid #f59e0b' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeShift === 'DAY' ? 600 : 400,
              color: activeShift === 'DAY' ? '#f59e0b' : '#6b7280',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sun size={16} /> Día ({dayReps.length})
          </button>
          <button
            onClick={() => setActiveShift('NIGHT')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeShift === 'NIGHT' ? '2px solid #6366f1' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeShift === 'NIGHT' ? 600 : 400,
              color: activeShift === 'NIGHT' ? '#6366f1' : '#6b7280',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Moon size={16} /> Noche ({nightReps.length})
          </button>
        </div>

        {/* Contenido según tab activo */}
        {activeShift === 'ALL' ? (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
              💡 Para reordenar, selecciona un turno específico
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mostrar ambos turnos en modo lectura */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
                  <Sun size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Turno Día ({dayReps.length})
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {dayReps.map(r => r.name).join(', ') || 'Sin representantes'}
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6366f1', fontWeight: 600 }}>
                  <Moon size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Turno Noche ({nightReps.length})
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {nightReps.map(r => r.name).join(', ') || 'Sin representantes'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ShiftSection
            shift={activeShift}
            representatives={activeShift === 'DAY' ? dayReps : nightReps}
            onEdit={setEditingRep}
            onAddSchedule={setAddingScheduleFor}
            addingScheduleFor={addingScheduleFor}
            advancedEditMode={advancedEditMode}
          />
        )}

        {inactiveReps.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <button onClick={() => setShowInactive(!showInactive)} style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              {showInactive ? 'Ocultar' : 'Mostrar'} {inactiveReps.length} representantes inactivos
            </button>
            {showInactive && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {inactiveReps.map(rep => (
                  <div key={rep.id} style={{ padding: '12px 16px', background: '#f9fafb', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#9ca3af', fontStyle: 'italic' }}>
                    {rep.name} (Inactivo)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
