import { createBaseSchedule } from '@/domain/state'
import type { EmploymentType } from '@/domain/types'
import {
  createRepresentativeDraft,
  getRepresentativeDraftChanges,
  getRepresentativeOffDayLabels,
} from './representativeEditorSchema'

describe('representativeEditorSchema', () => {
  it('creates a default draft for new representatives', () => {
    const draft = createRepresentativeDraft()

    expect(draft.name).toBe('')
    expect(draft.baseShift).toBe('DAY')
    expect(draft.role).toBe('SALES')
    expect(draft.employmentType).toBe('FULL_TIME')
    expect(draft.commercialEligible).toBe(true)
    expect(getRepresentativeOffDayLabels(draft.baseSchedule)).toEqual(['Lun'])
  })

  it('preserves undefined employment type for legacy representatives', () => {
    const draft = createRepresentativeDraft({
      id: 'rep-legacy',
      name: 'Ana Legacy',
      baseShift: 'DAY',
      role: 'SALES',
      baseSchedule: createBaseSchedule([1]),
      isActive: true,
      orderIndex: 0,
    })

    expect(draft.employmentType).toBeUndefined()
  })

  it('detects draft changes across editable sections', () => {
    const initialDraft = createRepresentativeDraft({
      id: 'rep-1',
      name: 'Ana',
      baseShift: 'DAY',
      role: 'SALES',
      baseSchedule: createBaseSchedule([1]),
      isActive: true,
      orderIndex: 0,
    })

    const editedDraft = {
      ...initialDraft,
      name: 'Ana Maria',
      role: 'CUSTOMER_SERVICE' as const,
      employmentType: 'PART_TIME' as EmploymentType,
      commercialEligible: true,
      baseSchedule: createBaseSchedule([0, 6]),
    }

    expect(getRepresentativeDraftChanges(initialDraft, editedDraft)).toEqual([
      'Nombre',
      'Rol',
      'Jornada contractual',
      'Elegibilidad comercial',
      'Dias libres base',
    ])
  })

  it('treats assigning a legacy employment type as a real change', () => {
    const initialDraft = createRepresentativeDraft({
      id: 'rep-legacy',
      name: 'Ana Legacy',
      baseShift: 'DAY',
      role: 'SALES',
      baseSchedule: createBaseSchedule([1]),
      isActive: true,
      orderIndex: 0,
    })

    const editedDraft = {
      ...initialDraft,
      employmentType: 'FULL_TIME' as EmploymentType,
    }

    expect(getRepresentativeDraftChanges(initialDraft, editedDraft)).toEqual([
      'Jornada contractual',
    ])
  })
})
