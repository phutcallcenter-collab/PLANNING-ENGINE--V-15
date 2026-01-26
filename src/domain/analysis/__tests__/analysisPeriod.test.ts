/**
 * TESTS HOSTILES - HELPERS DE PERÍODO
 * 
 * Batería completa de tests pensados para romper el sistema.
 * Si algo falla, el sistema NO está listo.
 * 
 * Objetivos:
 * - Validar límites
 * - Forzar estados inválidos
 * - Confirmar coherencia semántica
 * - Asegurar que no hay forma humana de usarlo mal
 */

import {
    createAnalysisPeriod,
    getPreviousPeriod,
    getYearAgoPeriod,
} from '../analysisPeriod'

// ============================================================================
// 1️⃣ createAnalysisPeriod – MONTH
// ============================================================================

describe('createAnalysisPeriod – MONTH', () => {
    it('crea correctamente un mes válido', () => {
        const p = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0, // Enero
        })

        expect(p.kind).toBe('MONTH')
        expect(p.label).toBe('Enero 2026')
        expect(p.from).toBe('2026-01-01')
        expect(p.to).toBe('2026-01-31')
    })

    it('rechaza month < 0', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'MONTH',
                year: 2026,
                month: -1,
            })
        ).toThrow('Invalid month')
    })

    it('rechaza month > 11', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'MONTH',
                year: 2026,
                month: 12,
            })
        ).toThrow('Invalid month')
    })

    it('no permite month flotante', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'MONTH',
                year: 2026,
                month: 1.5 as any,
            })
        ).toThrow()
    })

    it('handles December correctly', () => {
        const period = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2025,
            month: 11, // Diciembre
        })

        expect(period.label).toBe('Diciembre 2025')
        expect(period.from).toBe('2025-12-01')
        expect(period.to).toBe('2025-12-31')
    })
})

// ============================================================================
// 2️⃣ createAnalysisPeriod – QUARTER
// ============================================================================

describe('createAnalysisPeriod – QUARTER', () => {
    it('crea correctamente Q1', () => {
        const p = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 1,
        })

        expect(p.label).toBe('Ene–Mar 2026')
        expect(p.from).toBe('2026-01-01')
        expect(p.to).toBe('2026-03-31')
    })

    it('crea correctamente Q4', () => {
        const p = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 4,
        })

        expect(p.label).toBe('Oct–Dic 2026')
        expect(p.from).toBe('2026-10-01')
        expect(p.to).toBe('2026-12-31')
    })

    it('rechaza quarter = 0', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'QUARTER',
                year: 2026,
                quarter: 0 as any,
            })
        ).toThrow('Invalid quarter')
    })

    it('rechaza quarter > 4', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'QUARTER',
                year: 2026,
                quarter: 5 as any,
            })
        ).toThrow('Invalid quarter')
    })

    it('creates Q2 correctly', () => {
        const period = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 2,
        })

        expect(period.label).toBe('Abr–Jun 2026')
        expect(period.from).toBe('2026-04-01')
        expect(period.to).toBe('2026-06-30')
    })

    it('creates Q3 correctly', () => {
        const period = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 3,
        })

        expect(period.label).toBe('Jul–Sep 2026')
        expect(period.from).toBe('2026-07-01')
        expect(period.to).toBe('2026-09-30')
    })
})

// ============================================================================
// 3️⃣ getPreviousPeriod – MONTH (bordes peligrosos)
// ============================================================================

describe('getPreviousPeriod – MONTH', () => {
    it('Enero retrocede a Diciembre año anterior', () => {
        const jan = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        const prev = getPreviousPeriod(jan)

        expect(prev.label).toBe('Diciembre 2025')
        expect(prev.from).toBe('2025-12-01')
        expect(prev.to).toBe('2025-12-31')
    })

    it('Febrero retrocede a Enero mismo año', () => {
        const feb = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 1,
        })

        const prev = getPreviousPeriod(feb)

        expect(prev.label).toBe('Enero 2026')
    })

    it('gets previous month (same year)', () => {
        const march = createAnalysisPeriod({ kind: 'MONTH', year: 2026, month: 2 })
        const prev = getPreviousPeriod(march)

        expect(prev.label).toBe('Febrero 2026')
        expect(prev.from).toBe('2026-02-01')
    })
})

// ============================================================================
// 4️⃣ getPreviousPeriod – QUARTER (cruces de año)
// ============================================================================

describe('getPreviousPeriod – QUARTER', () => {
    it('Q1 retrocede a Q4 del año anterior', () => {
        const q1 = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 1,
        })

        const prev = getPreviousPeriod(q1)

        expect(prev.label).toBe('Oct–Dic 2025')
    })

    it('Q3 retrocede a Q2 mismo año', () => {
        const q3 = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 3,
        })

        const prev = getPreviousPeriod(q3)

        expect(prev.label).toBe('Abr–Jun 2026')
    })

    it('gets previous quarter (same year)', () => {
        const q2 = createAnalysisPeriod({ kind: 'QUARTER', year: 2026, quarter: 2 })
        const prev = getPreviousPeriod(q2)

        expect(prev.label).toBe('Ene–Mar 2026')
        expect(prev.from).toBe('2026-01-01')
    })
})

// ============================================================================
// 5️⃣ getYearAgoPeriod – MONTH
// ============================================================================

describe('getYearAgoPeriod – MONTH', () => {
    it('Enero 2026 → Enero 2025', () => {
        const p = createAnalysisPeriod({
            kind: 'MONTH',
            year: 2026,
            month: 0,
        })

        const prev = getYearAgoPeriod(p)

        expect(prev.label).toBe('Enero 2025')
        expect(prev.from).toBe('2025-01-01')
    })

    it('gets same month one year ago', () => {
        const jan2026 = createAnalysisPeriod({ kind: 'MONTH', year: 2026, month: 0 })
        const yearAgo = getYearAgoPeriod(jan2026)

        expect(yearAgo.label).toBe('Enero 2025')
        expect(yearAgo.from).toBe('2025-01-01')
    })
})

// ============================================================================
// 6️⃣ getYearAgoPeriod – QUARTER
// ============================================================================

describe('getYearAgoPeriod – QUARTER', () => {
    it('Ene–Mar 2026 → Ene–Mar 2025', () => {
        const p = createAnalysisPeriod({
            kind: 'QUARTER',
            year: 2026,
            quarter: 1,
        })

        const prev = getYearAgoPeriod(p)

        expect(prev.label).toBe('Ene–Mar 2025')
    })

    it('gets same quarter one year ago', () => {
        const q1_2026 = createAnalysisPeriod({ kind: 'QUARTER', year: 2026, quarter: 1 })
        const yearAgo = getYearAgoPeriod(q1_2026)

        expect(yearAgo.label).toBe('Ene–Mar 2025')
        expect(yearAgo.from).toBe('2025-01-01')
    })
})

// ============================================================================
// 7️⃣ TESTS HOSTILES – corrupción de input
// ============================================================================

describe('Hostile inputs', () => {
    it('rechaza kind inválido', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'WEEK' as any,
                year: 2026,
                month: 0,
            })
        ).toThrow()
    })

    it('rechaza year NaN', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'MONTH',
                year: NaN as any,
                month: 0,
            })
        ).toThrow()
    })

    it('rechaza year negativo', () => {
        expect(() =>
            createAnalysisPeriod({
                kind: 'MONTH',
                year: -2026,
                month: 0,
            })
        ).toThrow()
    })
})

// ============================================================================
// 8️⃣ TESTS HOSTILES – labels humanos SIEMPRE
// ============================================================================

describe('Human labels validation', () => {
    it('nunca devuelve labels técnicos para quarters', () => {
        const q1 = createAnalysisPeriod({ kind: 'QUARTER', year: 2026, quarter: 1 })
        const q2 = createAnalysisPeriod({ kind: 'QUARTER', year: 2026, quarter: 2 })
        const q3 = createAnalysisPeriod({ kind: 'QUARTER', year: 2026, quarter: 3 })
        const q4 = createAnalysisPeriod({ kind: 'QUARTER', year: 2026, quarter: 4 })

        // No debe contener "Q1", "Q2", etc
        expect(q1.label).not.toMatch(/Q\d/)
        expect(q2.label).not.toMatch(/Q\d/)
        expect(q3.label).not.toMatch(/Q\d/)
        expect(q4.label).not.toMatch(/Q\d/)

        // Debe contener labels en español
        expect(q1.label).toMatch(/Ene–Mar/)
        expect(q2.label).toMatch(/Abr–Jun/)
        expect(q3.label).toMatch(/Jul–Sep/)
        expect(q4.label).toMatch(/Oct–Dic/)
    })

    it('labels de meses siempre en español', () => {
        const jan = createAnalysisPeriod({ kind: 'MONTH', year: 2026, month: 0 })
        const dec = createAnalysisPeriod({ kind: 'MONTH', year: 2026, month: 11 })

        expect(jan.label).toBe('Enero 2026')
        expect(dec.label).toBe('Diciembre 2026')

        // No debe contener nombres en inglés
        expect(jan.label).not.toMatch(/January|Jan/)
        expect(dec.label).not.toMatch(/December|Dec/)
    })
})
