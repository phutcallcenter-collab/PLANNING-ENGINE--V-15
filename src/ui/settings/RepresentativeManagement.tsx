'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useEditMode } from '@/hooks/useEditMode'
import { useAccess } from '@/hooks/useAccess'
import { Representative, ShiftType } from '@/domain/types'
import type { RepresentativeWorkloadSelection } from '@/store/representativeSlice'
import { getRepresentativesByShift } from '@/domain/representatives/getRepresentativesByShift'
import { InactiveRepresentativesPanel } from './InactiveRepresentativesPanel'
import { RepresentativeDetailPanel } from './RepresentativeDetailPanel'
import { RepresentativeForm } from './RepresentativeForm'
import { RepresentativeFiltersBar } from './RepresentativeFiltersBar'
import { RepresentativeManagementHeader } from './RepresentativeManagementHeader'
import { RepresentativeSpecialSchedulesPanel } from './RepresentativeSpecialSchedulesPanel'
import { RepresentativeShiftTabs } from './RepresentativeShiftTabs'
import { RepresentativeWorkspaceModal } from './RepresentativeWorkspaceModal'
import { type RepresentativeDraft } from './representativeEditorSchema'
import {
  filterRepresentatives,
  hasActiveRepresentativeFilters,
  type RepresentativeRoleFilter,
  type RepresentativeStatusFilter,
} from './representativeManagementFilters'

type RepresentativeModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'detail'; repId: string }
  | { kind: 'edit'; repId: string }

function formatWorkloadSelection(selection: RepresentativeWorkloadSelection) {
  if (selection === 'MIXTO') {
    return 'Mixto'
  }

  return selection === 'PART_TIME' ? 'Part Time' : 'Full Time'
}

export function RepresentativeManagement() {
  const {
    representatives: allReps,
    specialSchedules,
    addRepresentative,
    bulkAssignEmploymentType,
    updateRepresentative,
    deactivateRepresentative,
    reactivateRepresentative,
  } = useAppStore(s => ({
    representatives: s.representatives ?? [],
    specialSchedules: s.specialSchedules ?? [],
    addRepresentative: s.addRepresentative,
    bulkAssignEmploymentType: s.bulkAssignEmploymentType,
    updateRepresentative: s.updateRepresentative,
    deactivateRepresentative: s.deactivateRepresentative,
    reactivateRepresentative: s.reactivateRepresentative,
  }))

  const { mode } = useEditMode()
  const advancedEditMode = mode === 'ADMIN_OVERRIDE'
  const { canEditData } = useAccess()

  const [modalState, setModalState] = useState<RepresentativeModalState>({
    kind: 'closed',
  })
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [activeShift, setActiveShift] = useState<ShiftType | 'ALL'>('DAY')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RepresentativeRoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<RepresentativeStatusFilter>('ALL')
  const [selectedRepresentativeIds, setSelectedRepresentativeIds] = useState<string[]>([])
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const activeReps = useMemo(() => allReps.filter(r => r.isActive !== false), [allReps])
  const inactiveReps = useMemo(() => allReps.filter(r => r.isActive === false), [allReps])

  const representativeFilters = useMemo(
    () => ({
      role: roleFilter,
      search: deferredSearchQuery,
      status: statusFilter,
    }),
    [deferredSearchQuery, roleFilter, statusFilter]
  )

  const filteredActiveReps = useMemo(
    () => filterRepresentatives(activeReps, representativeFilters),
    [activeReps, representativeFilters]
  )
  const filteredInactiveReps = useMemo(
    () => filterRepresentatives(inactiveReps, representativeFilters),
    [inactiveReps, representativeFilters]
  )

  const dayReps = useMemo(
    () => getRepresentativesByShift(filteredActiveReps, 'DAY'),
    [filteredActiveReps]
  )
  const nightReps = useMemo(
    () => getRepresentativesByShift(filteredActiveReps, 'NIGHT'),
    [filteredActiveReps]
  )
  const hasActiveFilters = useMemo(
    () => hasActiveRepresentativeFilters(representativeFilters),
    [representativeFilters]
  )
  const canReorderActiveShift = canEditData && !hasActiveFilters
  const reorderDisabledReason = !canEditData
    ? 'Tu sesión actual es de solo lectura. No puedes reordenar la lista.'
    : hasActiveFilters
      ? 'Limpia los filtros para reordenar el turno completo.'
      : undefined
  const filteredResultsCount = filteredActiveReps.length + filteredInactiveReps.length
  const visibleActiveReps = useMemo(() => {
    if (activeShift === 'DAY') {
      return dayReps
    }

    if (activeShift === 'NIGHT') {
      return nightReps
    }

    return filteredActiveReps
  }, [activeShift, dayReps, filteredActiveReps, nightReps])
  const visibleActiveRepIds = useMemo(
    () => visibleActiveReps.map(rep => rep.id),
    [visibleActiveReps]
  )
  const visibleUnassignedRepIds = useMemo(
    () => visibleActiveReps.filter(rep => !rep.employmentType).map(rep => rep.id),
    [visibleActiveReps]
  )
  const activeModalRepId =
    modalState.kind === 'detail' || modalState.kind === 'edit' ? modalState.repId : null
  const modalRepresentative = useMemo(
    () => allReps.find(rep => rep.id === activeModalRepId) ?? null,
    [activeModalRepId, allReps]
  )
  const modalRepresentativeSpecialScheduleCount = useMemo(
    () =>
      modalRepresentative
        ? specialSchedules.filter(
            schedule =>
              schedule.scope === 'INDIVIDUAL' &&
              schedule.targetId === modalRepresentative.id
          ).length
        : 0,
    [modalRepresentative, specialSchedules]
  )

  useEffect(() => {
    if (
      (modalState.kind === 'detail' || modalState.kind === 'edit') &&
      !modalRepresentative
    ) {
      setModalState({ kind: 'closed' })
      setIsFormDirty(false)
    }
  }, [modalRepresentative, modalState.kind])

  useEffect(() => {
    const activeIds = new Set(activeReps.map(rep => rep.id))

    setSelectedRepresentativeIds(current =>
      current.filter(id => activeIds.has(id))
    )
  }, [activeReps])

  const confirmModalDismiss = () => {
    if (!isFormDirty || modalState.kind === 'closed' || modalState.kind === 'detail') {
      return true
    }

    return confirm(
      modalState.kind === 'edit'
        ? 'Hay cambios sin guardar en esta ficha.\n\n¿Quieres salir y descartarlos?'
        : 'Hay una nueva ficha en progreso.\n\n¿Quieres cerrar la ventana y perder esos cambios?'
    )
  }

  const handleSelectRepresentative = (rep: Representative) => {
    if (modalState.kind === 'detail' && activeModalRepId === rep.id) {
      return
    }

    if (!confirmModalDismiss()) {
      return
    }

    setIsFormDirty(false)
    setModalState({ kind: 'detail', repId: rep.id })
  }

  const handleEditRepresentative = (rep?: Representative | null) => {
    if (!rep) {
      return
    }

    if (modalState.kind === 'edit' && activeModalRepId === rep.id) {
      return
    }

    if (!confirmModalDismiss()) {
      return
    }

    setIsFormDirty(false)
    setModalState({ kind: 'edit', repId: rep.id })
  }

  const handleCreateRepresentative = () => {
    if (!confirmModalDismiss()) {
      return
    }

    setIsFormDirty(false)
    setModalState({ kind: 'create' })
  }

  const handleCloseModal = () => {
    if (!confirmModalDismiss()) {
      return
    }

    setIsFormDirty(false)
    setModalState({ kind: 'closed' })
  }

  const handleReturnToDetail = () => {
    if (!confirmModalDismiss()) {
      return
    }

    if (!modalRepresentative) {
      handleCloseModal()
      return
    }

    setIsFormDirty(false)
    setModalState({ kind: 'detail', repId: modalRepresentative.id })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
    setShowInactive(false)
  }

  const handleToggleRepresentativeSelection = (rep: Representative) => {
    setSelectedRepresentativeIds(current =>
      current.includes(rep.id)
        ? current.filter(id => id !== rep.id)
        : [...current, rep.id]
    )
  }

  const handleSelectVisibleRepresentatives = () => {
    setSelectedRepresentativeIds(current => [
      ...new Set([...current, ...visibleActiveRepIds]),
    ])
  }

  const handleSelectVisibleRepresentativesWithoutEmployment = () => {
    setSelectedRepresentativeIds(current => [
      ...new Set([...current, ...visibleUnassignedRepIds]),
    ])
  }

  const handleClearRepresentativeSelection = () => {
    setSelectedRepresentativeIds([])
  }

  const handleBulkEmploymentAssignment = (
    employmentType: RepresentativeWorkloadSelection
  ) => {
    if (selectedRepresentativeIds.length === 0) {
      return
    }

    const confirmed = confirm(
      `Se asignará ${formatWorkloadSelection(employmentType)} a ${selectedRepresentativeIds.length} representante(s) seleccionado(s).\n\n¿Deseas continuar?`
    )

    if (!confirmed) {
      return
    }

    bulkAssignEmploymentType(selectedRepresentativeIds, employmentType)
    setSelectedRepresentativeIds([])
  }

  const handleSave = (data: RepresentativeDraft, id?: string) => {
    const message = id
      ? 'Editar un representante afecta la planificación histórica y futura.\n\n¿Estás seguro de que la información es correcta?'
      : 'Agregar un representante impactará los reportes y cobertura desde hoy.\n\n¿Estás seguro de continuar?'

    if (!confirm(message)) {
      return
    }

    if (id) {
      const existingRep = allReps.find(rep => rep.id === id)

      if (!existingRep) {
        return
      }

      updateRepresentative({ ...existingRep, ...data })
      setActiveShift(data.baseShift)
      setIsFormDirty(false)
      setModalState({ kind: 'detail', repId: id })
      return
    }

    const repsInShift = activeReps.filter(rep => rep.baseShift === data.baseShift)
    const maxOrderIndex =
      repsInShift.length > 0
        ? Math.max(...repsInShift.map(rep => rep.orderIndex || 0))
        : -1

    addRepresentative({ ...data, orderIndex: maxOrderIndex + 1 })

    const createdRep = [...useAppStore.getState().representatives]
      .filter(
        rep =>
          rep.name === data.name &&
          rep.baseShift === data.baseShift &&
          rep.role === data.role &&
          rep.isActive
      )
      .sort((left, right) => right.orderIndex - left.orderIndex)[0]

    setIsFormDirty(false)

    if (!createdRep) {
      setModalState({ kind: 'closed' })
      return
    }

    setActiveShift(createdRep.baseShift)
    setModalState({ kind: 'detail', repId: createdRep.id })
  }

  const renderModalContent = () => {
    if (modalState.kind === 'closed') {
      return null
    }

    if (modalState.kind === 'detail' && modalRepresentative) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '42px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#2563eb',
              }}
            >
              Ficha operativa
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                maxWidth: '72ch',
              }}
            >
              Aquí se concentra la vista completa del representante. Desde esta ventana
              puedes revisar la ficha, editarla o trabajar sus horarios especiales sin
              pelear con la lista principal.
            </p>
          </div>

          <RepresentativeDetailPanel
            advancedEditMode={advancedEditMode}
            representative={modalRepresentative}
            specialScheduleCount={modalRepresentativeSpecialScheduleCount}
            onCreateNew={handleCreateRepresentative}
            onDeactivate={() => {
              void deactivateRepresentative(modalRepresentative.id)
            }}
            onEdit={() => handleEditRepresentative(modalRepresentative)}
            onReactivate={() => {
              void reactivateRepresentative(modalRepresentative.id)
            }}
          />

          <RepresentativeSpecialSchedulesPanel representative={modalRepresentative} />
        </div>
      )
    }

    const isEditing = modalState.kind === 'edit'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            paddingRight: '42px',
          }}
        >
          <div style={{ maxWidth: '64ch' }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isEditing ? '#7c3aed' : '#0f766e',
                marginBottom: '8px',
              }}
            >
              {isEditing ? 'Edición guiada' : 'Alta nueva'}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
              }}
            >
              {isEditing
                ? 'Edita solo lo necesario, revisa los cambios detectados y vuelve a la ficha cuando termines.'
                : 'Completa la ficha base en una sola ventana y vuelve a la lista cuando quede lista.'}
            </p>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={handleReturnToDetail}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: 'white',
                color: '#334155',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Volver a la ficha
            </button>
          ) : null}
        </div>

        <RepresentativeForm
          key={isEditing ? modalRepresentative?.id ?? 'edit-representative' : 'new-representative'}
          onDirtyChange={setIsFormDirty}
          rep={isEditing ? modalRepresentative ?? undefined : undefined}
          onSave={handleSave}
          onCancel={isEditing ? handleReturnToDetail : handleCloseModal}
        />

        {isEditing && modalRepresentative ? (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px dashed rgba(99, 102, 241, 0.24)',
              background: 'rgba(238, 242, 255, 0.52)',
              color: '#4338ca',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            Los horarios especiales se gestionan desde la ficha operativa para que esta
            edición se mantenga enfocada en los datos base del representante.
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >
      <RepresentativeManagementHeader
        activeRepsCount={activeReps.length}
        dayRepsCount={dayReps.length}
        inactiveRepsCount={inactiveReps.length}
        isEditing={modalState.kind === 'edit'}
        nightRepsCount={nightReps.length}
        onCreateNew={handleCreateRepresentative}
      />

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderRadius: '24px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 18px 42px rgba(15, 23, 42, 0.05)',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#2563eb',
            }}
          >
            Lista maestra
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.08rem',
                color: 'var(--text-main)',
              }}
            >
              Explora y selecciona representantes
            </h3>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                maxWidth: '70ch',
              }}
            >
              Esta vista se queda enfocada en buscar y escanear. Crear, editar y revisar
              fichas ahora se resuelve en ventanas emergentes para que no tengas que
              perseguir un formulario mientras haces scroll.
            </p>
          </div>
        </div>

        <RepresentativeFiltersBar
          activeShift={activeShift}
          hasActiveFilters={hasActiveFilters}
          resultCount={filteredResultsCount}
          roleFilter={roleFilter}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onClearFilters={handleClearFilters}
          onRoleFilterChange={setRoleFilter}
          onSearchQueryChange={setSearchQuery}
          onStatusFilterChange={value => {
            setStatusFilter(value)
            if (value === 'INACTIVE') {
              setShowInactive(true)
            }
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '14px 16px',
            borderRadius: '18px',
            border: '1px solid rgba(124, 58, 237, 0.14)',
            background:
              'linear-gradient(135deg, rgba(250,245,255,0.96) 0%, rgba(255,255,255,0.98) 100%)',
          }}
        >
          <div style={{ display: 'grid', gap: '6px' }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7c3aed',
              }}
            >
              Asignación masiva por selección
            </div>
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                maxWidth: '68ch',
              }}
            >
              Marca representantes desde la lista y aplica la jornada al grupo
              seleccionado. No hace falta escribir nombres.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <span
              style={{
                padding: '8px 10px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(124, 58, 237, 0.14)',
                color: '#5b21b6',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {selectedRepresentativeIds.length} seleccionado(s)
            </span>
            <button
              type="button"
              onClick={handleSelectVisibleRepresentatives}
              disabled={!canEditData || visibleActiveRepIds.length === 0}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: 'white',
                color: '#334155',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor:
                  !canEditData || visibleActiveRepIds.length === 0
                    ? 'not-allowed'
                    : 'pointer',
                opacity: !canEditData || visibleActiveRepIds.length === 0 ? 0.65 : 1,
              }}
            >
              Seleccionar visibles ({visibleActiveRepIds.length})
            </button>
            <button
              type="button"
              onClick={handleSelectVisibleRepresentativesWithoutEmployment}
              disabled={!canEditData || visibleUnassignedRepIds.length === 0}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: 'white',
                color: '#92400e',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor:
                  !canEditData || visibleUnassignedRepIds.length === 0
                    ? 'not-allowed'
                    : 'pointer',
                opacity: !canEditData || visibleUnassignedRepIds.length === 0 ? 0.65 : 1,
              }}
            >
              Seleccionar sin jornada ({visibleUnassignedRepIds.length})
            </button>
            <button
              type="button"
              onClick={handleClearRepresentativeSelection}
              disabled={selectedRepresentativeIds.length === 0}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: 'white',
                color: '#64748b',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor:
                  selectedRepresentativeIds.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedRepresentativeIds.length === 0 ? 0.65 : 1,
              }}
            >
              Limpiar selección
            </button>
            <button
              type="button"
              onClick={() => handleBulkEmploymentAssignment('FULL_TIME')}
              disabled={!canEditData || selectedRepresentativeIds.length === 0}
              style={{
                border: 'none',
                background:
                  !canEditData || selectedRepresentativeIds.length === 0
                    ? '#cbd5e1'
                    : '#111827',
                color: 'white',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor:
                  !canEditData || selectedRepresentativeIds.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Aplicar Full Time
            </button>
            <button
              type="button"
              onClick={() => handleBulkEmploymentAssignment('PART_TIME')}
              disabled={!canEditData || selectedRepresentativeIds.length === 0}
              style={{
                border: 'none',
                background:
                  !canEditData || selectedRepresentativeIds.length === 0
                    ? '#cbd5e1'
                    : '#7c3aed',
                color: 'white',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor:
                  !canEditData || selectedRepresentativeIds.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Aplicar Part Time
            </button>
            <button
              type="button"
              onClick={() => handleBulkEmploymentAssignment('MIXTO')}
              disabled={!canEditData || selectedRepresentativeIds.length === 0}
              style={{
                border: 'none',
                background:
                  !canEditData || selectedRepresentativeIds.length === 0
                    ? '#cbd5e1'
                    : '#0f766e',
                color: 'white',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor:
                  !canEditData || selectedRepresentativeIds.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Aplicar Mixto
            </button>
          </div>
        </div>

        {statusFilter === 'INACTIVE' ? (
          <InactiveRepresentativesPanel
            inactiveReps={filteredInactiveReps}
            selectedRepId={activeModalRepId}
            showInactive
            alwaysExpanded
            headerLabel="Resultados inactivos"
            emptyMessage="No hay representantes inactivos que coincidan con la búsqueda actual."
            onSelect={handleSelectRepresentative}
            onToggle={() => undefined}
          />
        ) : (
          <>
            <RepresentativeShiftTabs
              activeRepsCount={filteredActiveReps.length}
              activeShift={activeShift}
              advancedEditMode={advancedEditMode}
              allowActiveShiftReorder={canReorderActiveShift}
              activeShiftReorderDisabledReason={reorderDisabledReason}
              dayReps={dayReps}
              nightReps={nightReps}
              selectedRepresentativeIds={selectedRepresentativeIds}
              selectedRepId={activeModalRepId}
              onActiveShiftChange={setActiveShift}
              onEdit={handleEditRepresentative}
              onSelect={handleSelectRepresentative}
              onToggleSelection={handleToggleRepresentativeSelection}
            />

            {statusFilter !== 'ACTIVE' ? (
              <InactiveRepresentativesPanel
                inactiveReps={filteredInactiveReps}
                selectedRepId={activeModalRepId}
                showInactive={showInactive}
                emptyMessage="No hay representantes inactivos que coincidan con la búsqueda actual."
                onSelect={handleSelectRepresentative}
                onToggle={() => setShowInactive(!showInactive)}
              />
            ) : null}
          </>
        )}

        <div
          style={{
            padding: '14px 16px',
            borderRadius: '16px',
            border: '1px dashed rgba(37, 99, 235, 0.2)',
            background: 'rgba(239, 246, 255, 0.58)',
            color: '#1d4ed8',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          Consejo: usa la lista para ubicar rápido a alguien y abre su ventana para
          trabajar tranquilo. La lista ya no carga formularios ni horarios especiales
          encima, así que debería sentirse mucho más ligera.
        </div>
      </section>

      {modalState.kind !== 'closed' ? (
        <RepresentativeWorkspaceModal
          maxWidth={modalState.kind === 'detail' ? 1160 : 900}
          onClose={handleCloseModal}
        >
          {renderModalContent()}
        </RepresentativeWorkspaceModal>
      ) : null}
    </div>
  )
}
