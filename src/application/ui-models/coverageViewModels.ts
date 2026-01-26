/**
 * 🔄 COVERAGE UI CONTRACTS
 * 
 * View models and contracts for Coverage UI.
 * These are DERIVED from domain entities, never the source of truth.
 * 
 * CRITICAL RULES:
 * - UI never creates Coverage directly
 * - UI never modifies plan or reality
 * - UI only reflects DayResolution.computed
 */

import { ISODate, RepresentativeId } from '@/domain/types'
import { ShiftType } from '@/domain/calendar/types'
import { Coverage } from '@/domain/planning/coverage'

/**
 * 🟢 PLANNER CELL VIEW
 * 
 * What the planner needs to render a single cell.
 * This is already computed by the domain.
 */
export interface PlannerCellView {
    repId: RepresentativeId
    date: ISODate
    shift: ShiftType

    /** Badge already resolved by domain */
    badge?: 'CUBIERTO' | 'CUBRIENDO' | 'AUSENCIA' | 'VACACIONES' | 'LICENCIA'

    /** Coverage ID if badge is coverage-related */
    coverageId?: string
}

/**
 * 🟠 COVERAGE DETAIL VIEW
 * 
 * View model for displaying coverage details in a modal.
 */
export interface CoverageDetailView {
    coverageId: string
    date: ISODate
    shift: ShiftType

    covered: {
        id: RepresentativeId
        name: string
    }

    covering: {
        id: RepresentativeId
        name: string
    }

    note?: string
    status: 'ACTIVE' | 'CANCELLED'
    createdAt: string
}

/**
 * 🔵 COVERAGE CREATION FORM
 * 
 * Input for creating a new coverage.
 */
export interface CoverageCreationForm {
    date: ISODate
    shift: ShiftType
    coveredRepId: RepresentativeId
    coveringRepId: RepresentativeId
    note?: string
}

/**
 * 🟣 COVERAGE MODAL MODE
 * 
 * Modal can be in one of three modes.
 */
export type CoverageModalMode = 'CREATE' | 'VIEW' | 'EDIT_ADVANCED'

/**
 * 🔄 COVERAGE MODAL PROPS
 */
export interface CoverageModalProps {
    mode: CoverageModalMode
    coverageId?: string // Required for VIEW and EDIT_ADVANCED
    initialDate?: ISODate // Pre-fill for CREATE
    initialShift?: ShiftType // Pre-fill for CREATE
    onClose: () => void
    onSave?: (coverage: Coverage) => void
    onCancel?: (coverageId: string) => void
}

/**
 * 🎨 BADGE COMPONENT PROPS
 */
export interface CoverageBadgeProps {
    type: 'CUBIERTO' | 'CUBRIENDO' | 'AUSENCIA' | 'VACACIONES' | 'LICENCIA'
    onClick?: () => void
    size?: 'sm' | 'md' | 'lg'
}
