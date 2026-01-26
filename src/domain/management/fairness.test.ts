import { analyzeStructuralBalance, ManagerLoadContext } from './fairness'

describe('Structural Fairness Analysis', () => {
    // Escenario Base: Equipo Balanceado
    const balancedTeam: ManagerLoadContext[] = [
        { managerId: '1', name: 'A', weeklyLoad: 40, shifts: [{ date: '2026-01-05', type: 'DAY' }] },
        { managerId: '2', name: 'B', weeklyLoad: 42, shifts: [{ date: '2026-01-05', type: 'DAY' }] },
        { managerId: '3', name: 'C', weeklyLoad: 38, shifts: [{ date: '2026-01-05', type: 'DAY' }] },
    ]

    test('should return STABLE for balanced teams', () => {
        const result = analyzeStructuralBalance(balancedTeam)
        expect(result.status).toBe('STABLE')
        expect(result.fairnessScore).toBeLessThan(40)
    })

    test('should detect STATISTICAL OUTLIER (Rule 1)', () => {
        const outlierTeam = [
            ...balancedTeam,
            // Manager D carga mucho más (65 vs ~40)
            { managerId: '4', name: 'D', weeklyLoad: 65, shifts: [] }
        ]

        const result = analyzeStructuralBalance(outlierTeam)
        // Debería ser UNBALANCED o STRUCTURALLY_UNFAIR dependiendo del desvío
        // Avg ~46, Std ~11.  65 > 46 + 11 (57).
        expect(result.status).not.toBe('STABLE')
        expect(result.offenders[0].name).toBe('D')
        expect(result.offenders[0].reasons[0]).toContain('Carga')
    })

    test('should detect STRUCTURAL PUNISHMENT (Rule 2: 3 Nights + Weekend)', () => {
        // Manager "Victim" tiene carga numérica normal pero estructura tóxica
        const victimContext: ManagerLoadContext = {
            managerId: 'victim',
            name: 'Victim',
            weeklyLoad: 45, // Carga numérica "aceptable"
            shifts: [
                { date: '2026-01-05', type: 'NIGHT' }, // Lunes (ok)
                { date: '2026-01-07', type: 'NIGHT' }, // Miércoles (ok)
                { date: '2026-01-10', type: 'NIGHT' }, // Sábado (TOXIC!)
            ]
        }

        const team = [
            ...balancedTeam,
            victimContext
        ]

        const result = analyzeStructuralBalance(team)

        expect(result.status).toBe('STRUCTURALLY_UNFAIR')
        const offender = result.offenders.find(o => o.name === 'Victim')
        expect(offender).toBeDefined()
        expect(offender?.reasons).toContain('Patrón nocturno de alta fricción (3+ noches con fin de semana)')
        expect(result.encryption).not.toBeNull()
    })
})
