import { computeCoverageFailureKPI } from './computeCoverageFailureKPI'

describe('KPI: Coverage Failure', () => {
    it('counts coverage failures independently of base absences', () => {
        const incidents: any[] = [
            { type: 'AUSENCIA', source: 'COVERAGE', slotOwnerId: 'LUZ' }, // Counted
            { type: 'AUSENCIA', source: 'BASE', representativeId: 'EMELY' }, // Not counted (Base)
            { type: 'TARDANZA', source: 'COVERAGE', slotOwnerId: 'ANA' }   // Not counted (Tardanza)
        ]

        expect(computeCoverageFailureKPI(incidents)).toBe(1)
    })

    it('returns 0 if no coverage failures exist', () => {
        const incidents: any[] = [
            { type: 'AUSENCIA', source: 'BASE', representativeId: 'EMELY' }
        ]
        expect(computeCoverageFailureKPI(incidents)).toBe(0)
    })
})
