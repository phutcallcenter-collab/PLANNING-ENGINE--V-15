'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  EmploymentType,
  RepresentativeRole,
  ShiftType,
  Representative,
} from '@/domain/types'
import { RepresentativeDayScheduleSelector } from './RepresentativeDayScheduleSelector'
import { RepresentativeFormActions } from './RepresentativeFormActions'
import { RepresentativeFormHeader } from './RepresentativeFormHeader'
import { RepresentativeMixProfileField } from './RepresentativeMixProfileField'
import { RepresentativeRoleField } from './RepresentativeRoleField'
import { RepresentativeShiftSelector } from './RepresentativeShiftSelector'
import {
  countRepresentativeDayOffs,
  getRepresentativeCommercialLabel,
  createRepresentativeDraft,
  getRepresentativeEmploymentLabel,
  getRepresentativeDraftChanges,
  getRepresentativeMixLabel,
  getRepresentativeRoleLabel,
  getRepresentativeShiftLabel,
  type RepresentativeDraft,
} from './representativeEditorSchema'
import { representativeFormStyles } from './representativeFormStyles'

type WorkloadSelection = EmploymentType | 'MIXTO' | ''

interface RepresentativeFormProps {
  onDirtyChange?: (isDirty: boolean) => void
  rep?: Representative
  onSave: (data: RepresentativeDraft, id?: string) => void
  onCancel: () => void
}

export function RepresentativeForm({
  onDirtyChange,
  rep,
  onSave,
  onCancel,
}: RepresentativeFormProps) {
  const initialDraft = useMemo(() => createRepresentativeDraft(rep), [rep])

  const [name, setName] = useState(initialDraft.name)
  const [baseShift, setBaseShift] = useState<ShiftType>(initialDraft.baseShift)
  const [role, setRole] = useState<RepresentativeRole>(initialDraft.role)
  const [baseSchedule, setBaseSchedule] = useState(initialDraft.baseSchedule)
  const [mixProfile, setMixProfile] = useState<'' | 'WEEKDAY' | 'WEEKEND'>(
    initialDraft.mixProfile?.type || ''
  )
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>(
    initialDraft.employmentType ?? ''
  )
  const [commercialEligible, setCommercialEligible] = useState(
    initialDraft.commercialEligible === true
  )

  useEffect(() => {
    setName(initialDraft.name)
    setBaseShift(initialDraft.baseShift)
    setRole(initialDraft.role)
    setBaseSchedule(initialDraft.baseSchedule)
    setMixProfile(initialDraft.mixProfile?.type || '')
    setEmploymentType(initialDraft.employmentType ?? '')
    setCommercialEligible(initialDraft.commercialEligible === true)
  }, [initialDraft])

  const currentDraft = useMemo<RepresentativeDraft>(
    () => ({
      name,
      baseShift,
      role,
      baseSchedule,
      mixProfile: mixProfile ? { type: mixProfile } : undefined,
      employmentType: employmentType || undefined,
      commercialEligible,
    }),
    [baseSchedule, baseShift, commercialEligible, employmentType, mixProfile, name, role]
  )

  const pendingChanges = useMemo(
    () => getRepresentativeDraftChanges(initialDraft, currentDraft),
    [currentDraft, initialDraft]
  )
  const isDirty = pendingChanges.length > 0
  const dayOffCount = useMemo(
    () => countRepresentativeDayOffs(baseSchedule),
    [baseSchedule]
  )
  const workloadSelection: WorkloadSelection = mixProfile
    ? 'MIXTO'
    : employmentType

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(
    () => () => {
      onDirtyChange?.(false)
    },
    [onDirtyChange]
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      return
    }

    onSave(
      {
        ...currentDraft,
        name: name.trim(),
      },
      rep?.id
    )
  }

  const handleReset = () => {
    setName(initialDraft.name)
    setBaseShift(initialDraft.baseShift)
    setRole(initialDraft.role)
    setBaseSchedule(initialDraft.baseSchedule)
    setMixProfile(initialDraft.mixProfile?.type || '')
    setEmploymentType(initialDraft.employmentType ?? '')
    setCommercialEligible(initialDraft.commercialEligible === true)
  }

  const handleWorkloadChange = (value: WorkloadSelection) => {
    if (value === 'MIXTO') {
      setEmploymentType(current => current || 'FULL_TIME')
      setMixProfile(current => current || 'WEEKEND')
      return
    }

    setEmploymentType(value)
    setMixProfile('')
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = confirm(
        rep
          ? 'Hay cambios sin guardar en esta ficha.\n\n¿Quieres salir de la edición y descartarlos?'
          : 'Hay datos sin guardar en esta nueva ficha.\n\n¿Quieres limpiar el formulario y salir?'
      )

      if (!confirmed) {
        return
      }
    }

    onCancel()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={representativeFormStyles.form}
    >
      <RepresentativeFormHeader
        isEditing={Boolean(rep)}
        isDirty={isDirty}
        repName={rep?.name}
        onCancel={handleCancel}
      />

      <div style={representativeFormStyles.liveSummary}>
        {[
          `Turno ${getRepresentativeShiftLabel(baseShift)}`,
          getRepresentativeRoleLabel(role),
          getRepresentativeEmploymentLabel(
            employmentType || undefined,
            mixProfile ? { type: mixProfile } : undefined
          ),
          `${dayOffCount} dia(s) OFF base`,
          mixProfile
            ? getRepresentativeMixLabel({
                mixProfile: { type: mixProfile },
              })
            : null,
          getRepresentativeCommercialLabel(commercialEligible),
        ].filter(Boolean).map(item => (
          <span key={item} style={representativeFormStyles.liveSummaryChip}>
            {item}
          </span>
        ))}
      </div>

      <div
        style={
          isDirty
            ? representativeFormStyles.changeNoticePending
            : representativeFormStyles.changeNoticeIdle
        }
      >
        <div style={representativeFormStyles.changeNoticeTitle}>
          {isDirty
            ? `${pendingChanges.length} cambio(s) listo(s) para guardar`
            : rep
              ? 'Sin cambios pendientes en esta ficha'
              : 'Completa la ficha base y guarda cuando todo se vea bien'}
        </div>
        <div style={representativeFormStyles.changeNoticeBody}>
          {isDirty
            ? `Campos tocados: ${pendingChanges.join(', ')}.`
            : rep
              ? 'Puedes ajustar solo una parte de la ficha y guardar sin tener que recapturar el resto.'
              : 'El panel mantiene el contexto listo para que crear nuevas fichas sea rapido y ordenado.'}
        </div>
      </div>

      <div>
        <label style={representativeFormStyles.sectionTitle}>
          Nombre Completo
        </label>
        <input
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Ej: Ana García"
          style={representativeFormStyles.input}
          required
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <RepresentativeRoleField role={role} onChange={setRole} />
        <RepresentativeShiftSelector
          baseShift={baseShift}
          onChange={setBaseShift}
        />
        <div>
          <label style={representativeFormStyles.sectionTitle}>Jornada</label>
          <select
            value={workloadSelection}
            onChange={event =>
              handleWorkloadChange(event.target.value as WorkloadSelection)
            }
            style={representativeFormStyles.select}
          >
            <option value="">Sin definir</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="MIXTO">Mixto</option>
          </select>
        </div>
        {mixProfile ? (
          <RepresentativeMixProfileField
            mixProfile={mixProfile}
            onChange={setMixProfile}
          />
        ) : null}
        <div>
          <label style={representativeFormStyles.sectionTitle}>
            Ranking comercial
          </label>
          <select
            value={commercialEligible ? 'YES' : 'NO'}
            onChange={event => setCommercialEligible(event.target.value === 'YES')}
            style={representativeFormStyles.select}
          >
            <option value="YES">Participa</option>
            <option value="NO">Solo operativo</option>
          </select>
        </div>
      </div>

      <div>
        <label style={representativeFormStyles.sectionTitle}>
          Días Libres Base (semana)
        </label>
        <p style={representativeFormStyles.helperText}>
          Selecciona los días que el representante NO trabaja
        </p>
        <RepresentativeDayScheduleSelector
          schedule={baseSchedule}
          onChange={setBaseSchedule}
        />
      </div>

      <RepresentativeFormActions
        canReset={isDirty}
        isDirty={isDirty}
        isEditing={Boolean(rep)}
        onCancel={handleCancel}
        onReset={handleReset}
        submitDisabled={!name.trim() || (Boolean(rep) && !isDirty)}
      />
    </form>
  )
}
