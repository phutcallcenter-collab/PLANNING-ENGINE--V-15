import { Incident } from '../incidents/types'

/**
 * COVERAGE FAILURE KPI
 *
 * Counts how many planned slots were left empty
 * due to failed coverage.
 *
 * This is OPERATIONAL impact, not disciplinary.
 * 
 * @param incidents All incidents for the period
 * @returns Number of slots that failed due to coverage issues
 */
export function computeCoverageFailureKPI(incidents: Incident[]): number {
    return incidents.filter(i =>
        i.type === 'AUSENCIA' &&
        i.source === 'COVERAGE' &&
        !!i.slotOwnerId
    ).length
}
