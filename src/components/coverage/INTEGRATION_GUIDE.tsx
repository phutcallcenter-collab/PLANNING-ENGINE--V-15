/**
 * 📋 COVERAGE INTEGRATION GUIDE
 * 
 * How to integrate Coverage badges into Planner and Daily Log.
 * 
 * CRITICAL: This is REFERENCE CODE, not a complete component.
 * Copy the patterns into your existing components.
 */

import React, { useState } from 'react'
import { CoverageBadge } from '@/components/coverage/CoverageBadge'
import { CoverageDetailModal } from '@/components/coverage/CoverageDetailModal'
import { useCoverageStore } from '@/store/useCoverageStore'
import { buildWeeklySchedule } from '@/domain/planning/buildWeeklySchedule'
import { findCoverageForDay } from '@/domain/planning/coverage'

/**
 * 1️⃣ PLANNER DATA PREPARATION
 * 
 * Inject coverages into buildWeeklySchedule.
 * This should be done in your planner data hook/selector.
 */
function usePlannerData(weekStart: string) {
    const { getActiveCoverages } = useCoverageStore()
    const coverages = getActiveCoverages()

    // TODO: Fetch these from your existing hooks/stores
    const agents = [] as any // Replace with actual data
    const incidents = [] as any
    const specialSchedules = [] as any
    const weekDays = [] as any
    const allCalendarDays = [] as any

    const weeklyPlan = buildWeeklySchedule(
        agents,
        incidents,
        specialSchedules,
        weekDays,
        allCalendarDays,
        coverages // 👈 KEY: Inject coverages here
    )

    return weeklyPlan
}

/**
 * 2️⃣ PLANNER CELL RENDERING
 * 
 * Render badge from DayResolution.computed.display
 */
function PlannerCell({
    repId,
    date,
    dayResolution
}: {
    repId: string
    date: string
    dayResolution: any // DayResolution from domain
}) {
    const [showModal, setShowModal] = useState(false)
    const [modalCoverageId, setModalCoverageId] = useState<string | undefined>()

    const openCoverageDetail = (coverageId: string) => {
        setModalCoverageId(coverageId)
        setShowModal(true)
    }

    // Find coverage ID if badge is coverage-related
    const { getActiveCoverages } = useCoverageStore()
    const coverages = getActiveCoverages()
    const coverage = findCoverageForDay(repId, date, coverages)

    const coverageId = coverage.isCovered
        ? coverage.coveredBy?.coverageId
        : coverage.isCovering
            ? coverage.covering?.coverageId
            : undefined

    return (
        <div className="planner-cell">
            {/* Normal cell content */}
            <div className="cell-content">
                {/* ... your existing planner cell UI */}
            </div>

            {/* Badge (if any) */}
            {dayResolution.computed.display.badge && (
                <CoverageBadge
                    type={dayResolution.computed.display.badge}
                    size="sm"
                    onClick={
                        coverageId
                            ? () => openCoverageDetail(coverageId)
                            : undefined
                    }
                />
            )}

            {/* Modal */}
            {showModal && modalCoverageId && (
                <CoverageDetailModal
                    mode="VIEW"
                    coverageId={modalCoverageId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}

/**
 * 3️⃣ DAILY LOG RENDERING
 * 
 * Show badge in daily incident log
 */
function DailyLogEntry({
    repId,
    date,
    dayResolution
}: any) {
    const [showModal, setShowModal] = useState(false)
    const { getActiveCoverages } = useCoverageStore()

    const coverages = getActiveCoverages()
    const coverage = findCoverageForDay(repId, date, coverages)

    const coverageId = coverage.isCovered
        ? coverage.coveredBy?.coverageId
        : coverage.isCovering
            ? coverage.covering?.coverageId
            : undefined

    return (
        <div className="daily-log-entry">
            <span className="rep-name">{/* Rep name */}</span>
            <span className="date">{date}</span>

            {/* Badge */}
            {dayResolution.computed.display.badge && (
                <CoverageBadge
                    type={dayResolution.computed.display.badge}
                    size="sm"
                    onClick={
                        (dayResolution.computed.display.badge === 'CUBIERTO' ||
                            dayResolution.computed.display.badge === 'CUBRIENDO') && coverageId
                            ? () => setShowModal(true)
                            : undefined
                    }
                />
            )}

            {/* Modal */}
            {showModal && coverageId && (
                <CoverageDetailModal
                    mode="VIEW"
                    coverageId={coverageId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}

/**
 * 4️⃣ CREATE COVERAGE BUTTON
 * 
 * Add a button to open coverage creation modal
 */
function CreateCoverageButton({
    initialDate,
    initialShift
}: {
    initialDate?: string
    initialShift?: 'DAY' | 'NIGHT'
}) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <button onClick={() => setShowModal(true)}>
                + Nueva Cobertura
            </button>

            {showModal && (
                <CoverageDetailModal
                    mode="CREATE"
                    initialDate={initialDate}
                    initialShift={initialShift}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    )
}

/**
 * ✅ INTEGRATION CHECKLIST
 * 
 * [ ] 1. Import useCoverageStore in planner data hook
 * [ ] 2. Pass coverages to buildWeeklySchedule
 * [ ] 3. Render CoverageBadge in planner cells
 * [ ] 4. Make badges clickable (open modal)
 * [ ] 5. Render CoverageBadge in daily log
 * [ ] 6. Add "Create Coverage" button somewhere
 * [ ] 7. Test: Create coverage → badges appear
 * [ ] 8. Test: Cancel coverage → badges disappear
 * [ ] 9. Test: AUSENCIA + Coverage → AUSENCIA badge shows
 */
