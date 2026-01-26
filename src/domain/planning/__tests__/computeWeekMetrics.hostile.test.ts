
import { computeWeekMetrics } from '@/domain/planning/computeWeekMetrics'
import { DayResolution } from '@/domain/planning/dayResolution'

describe('🛡️ HOSTILE: Weekly Aggregation Rules', () => {

    it('🔥 AUSENCIA rompe incentivos (6 trabajados + 1 ausencia)', () => {
        const days: DayResolution[] = [
            // 6 días trabajados normalmente
            ...Array(6).fill(null).map(() => ({
                plan: { assignment: { type: 'SINGLE', shift: 'DAY' }, source: 'BASE' },
                reality: { status: 'WORKING' },
                computed: {
                    display: { appearsInPlanner: true, appearsInShifts: ['DAY'], badge: undefined },
                    metrics: { countsAsWorked: true, countsForIncentives: true, countsAsAbsence: false }
                }
            })),
            // 1 día ausente
            {
                plan: { assignment: { type: 'SINGLE', shift: 'DAY' }, source: 'BASE' },
                reality: { status: 'WORKING', incidentType: 'AUSENCIA' },
                computed: {
                    display: { appearsInPlanner: true, appearsInShifts: ['DAY'], badge: 'AUSENCIA' },
                    metrics: { countsAsWorked: true, countsForIncentives: false, countsAsAbsence: true }
                }
            }
        ] as any

        const week = computeWeekMetrics(days)

        expect(week.attendance.plannedDays).toBe(7)
        expect(week.attendance.workedDays).toBe(6) // Ausencia no cuenta como trabajado
        expect(week.attendance.absentDays).toBe(1)

        expect(week.incentives.eligible).toBe(false) // ❌ Una ausencia rompe todo
        expect(week.incentives.disqualifiedByAbsence).toBe(true)
        expect(week.incentives.workedDays).toBe(6) // Solo los que cuentan
    })

    it('🔥 VACACIONES no penalizan (4 trabajados + 3 vacaciones)', () => {
        const days: DayResolution[] = [
            // 4 días trabajados
            ...Array(4).fill(null).map(() => ({
                plan: { assignment: { type: 'SINGLE', shift: 'DAY' }, source: 'BASE' },
                reality: { status: 'WORKING' },
                computed: {
                    display: { appearsInPlanner: true, appearsInShifts: ['DAY'], badge: undefined },
                    metrics: { countsAsWorked: true, countsForIncentives: true, countsAsAbsence: false }
                }
            })),
            // 3 días de vacaciones (no cuentan para nada)
            ...Array(3).fill(null).map(() => ({
                plan: { assignment: { type: 'SINGLE', shift: 'DAY' }, source: 'BASE' },
                reality: { status: 'OFF', incidentType: 'VACACIONES' },
                computed: {
                    display: { appearsInPlanner: false, appearsInShifts: [], badge: 'VACACIONES' },
                    metrics: { countsAsWorked: false, countsForIncentives: false, countsAsAbsence: false }
                }
            }))
        ] as any

        const week = computeWeekMetrics(days)

        expect(week.attendance.plannedDays).toBe(4) // Vacaciones no cuentan como planificados
        expect(week.attendance.workedDays).toBe(4)
        expect(week.attendance.absentDays).toBe(0)

        expect(week.incentives.eligible).toBe(true) // ✅ Sin ausencias, elegible
        expect(week.incentives.disqualifiedByAbsence).toBe(false)
    })

    it('🔥 SWAP suma positivo (2 días cubriendo)', () => {
        const days: DayResolution[] = [
            // 5 días normales
            ...Array(5).fill(null).map(() => ({
                plan: { assignment: { type: 'SINGLE', shift: 'DAY' }, source: 'BASE' },
                reality: { status: 'WORKING' },
                computed: {
                    display: { appearsInPlanner: true, appearsInShifts: ['DAY'], badge: undefined },
                    metrics: { countsAsWorked: true, countsForIncentives: true, countsAsAbsence: false }
                }
            })),
            // 2 días cubriendo (SWAP)
            ...Array(2).fill(null).map(() => ({
                plan: { assignment: { type: 'SINGLE', shift: 'NIGHT' }, source: 'SWAP' },
                reality: { status: 'WORKING' },
                computed: {
                    display: { appearsInPlanner: true, appearsInShifts: ['NIGHT'], badge: 'CUBRIENDO' },
                    metrics: { countsAsWorked: true, countsForIncentives: true, countsAsAbsence: false }
                }
            }))
        ] as any

        const week = computeWeekMetrics(days)

        expect(week.coverage.coveringDays).toBe(2)
        expect(week.incentives.coveredDays).toBe(2) // Covering cuenta positivo
        expect(week.incentives.workedDays).toBe(7) // 5 + 2
        expect(week.incentives.eligible).toBe(true)
    })

    it('🔥 MIXTO no duplica (7 días mixto = 7 días, no 14)', () => {
        const days: DayResolution[] = Array(7).fill(null).map(() => ({
            plan: { assignment: { type: 'BOTH' }, source: 'SPECIAL' },
            reality: { status: 'WORKING' },
            computed: {
                display: { appearsInPlanner: true, appearsInShifts: ['DAY', 'NIGHT'], badge: undefined },
                metrics: { countsAsWorked: true, countsForIncentives: true, countsAsAbsence: false }
            }
        })) as any

        const week = computeWeekMetrics(days)

        expect(week.attendance.plannedDays).toBe(7) // ✅ No duplica
        expect(week.attendance.workedDays).toBe(7) // ✅ No duplica
        expect(week.incentives.workedDays).toBe(7) // ✅ No duplica
    })

    it('Semana parcial (3 días trabajados, 4 OFF base)', () => {
        const days: DayResolution[] = [
            // 3 días trabajados
            ...Array(3).fill(null).map(() => ({
                plan: { assignment: { type: 'SINGLE', shift: 'DAY' }, source: 'BASE' },
                reality: { status: 'WORKING' },
                computed: {
                    display: { appearsInPlanner: true, appearsInShifts: ['DAY'], badge: undefined },
                    metrics: { countsAsWorked: true, countsForIncentives: true, countsAsAbsence: false }
                }
            })),
            // 4 días OFF (base schedule)
            ...Array(4).fill(null).map(() => ({
                plan: { assignment: { type: 'NONE' }, source: 'BASE' },
                reality: { status: 'OFF' },
                computed: {
                    display: { appearsInPlanner: false, appearsInShifts: [], badge: undefined },
                    metrics: { countsAsWorked: false, countsForIncentives: false, countsAsAbsence: false }
                }
            }))
        ] as any

        const week = computeWeekMetrics(days)

        expect(week.attendance.plannedDays).toBe(3) // Solo los que debía trabajar
        expect(week.attendance.workedDays).toBe(3)
        expect(week.incentives.eligible).toBe(true)
    })
})
