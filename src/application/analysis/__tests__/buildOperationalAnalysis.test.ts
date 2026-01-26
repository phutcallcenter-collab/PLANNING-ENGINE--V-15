/**
 * TESTS HOSTILES - APPLICATION / buildOperationalAnalysis
 * 
 * Tests diseñados para romper el builder si hay huecos semánticos.
 */

import { buildOperationalAnalysis } from '../buildOperationalAnalysis'
import { createAnalysisPeriod } from '@/domain/analysis/analysisPeriod'

describe('buildOperationalAnalysis – Hostile', () => {
    const reps: any[] = []
    const incidents: any[] = []

    it('revienta si se intenta MONTH vs QUARTER', () => {
        const base = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        const compared = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 1,
        })

        expect(() =>
            buildOperationalAnalysis(reps, incidents, base, compared)
        ).toThrow('Cannot compare')
    })

    it('revienta si base === compared (misma referencia)', () => {
        const base = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        // Intentar comparar el mismo período consigo mismo
        expect(() =>
            buildOperationalAnalysis(reps, incidents, base, base)
        ).toThrow()
    })

    it('revienta si base y compared son períodos idénticos (distinta identidad)', () => {
        const base = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        const compared = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        // Mismo período temporal pero distintas referencias
        expect(() =>
            buildOperationalAnalysis(reps, incidents, base, compared)
        ).toThrow('Cannot compare identical periods')
    })

    it('acepta períodos válidos de la misma granularidad', () => {
        const base = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        const compared = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2025,
            month: 11,
        })

        const result = buildOperationalAnalysis(reps, incidents, base, compared)

        expect(result).toBeDefined()
        expect(result.base.period).toEqual(base)
        expect(result.compared.period).toEqual(compared)
    })

    it('acepta quarters válidos de la misma granularidad', () => {
        const base = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 1,
        })

        const compared = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2025,
            quarter: 4,
        })

        const result = buildOperationalAnalysis(reps, incidents, base, compared)

        expect(result).toBeDefined()
        expect(result.shifts).toHaveLength(2)
        expect(result.shifts[0].shift).toBe('DAY')
        expect(result.shifts[1].shift).toBe('NIGHT')
    })
})
