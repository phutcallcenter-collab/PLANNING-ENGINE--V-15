/**
 * 🧪 TESTS: buildDailyEffectiveContext
 * 
 * Estos tests verifican que el builder de contexto efectivo
 * calcula correctamente el estado real de un día.
 */

import { buildDailyEffectiveContext } from '../../../src/domain/swaps/buildDailyEffectiveContext'
import { WeeklyPlan, SwapEvent, Incident, Representative, ISODate } from '../../../src/domain/types'
import { DayInfo } from '../../../src/domain/calendar/types'

describe('buildDailyEffectiveContext', () => {
    const date: ISODate = '2026-01-15'

    const mockRepresentatives: Representative[] = [
        {
            id: 'ana',
            name: 'Ana García',
            baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
            baseShift: 'DAY',
            role: 'SALES',
            isActive: true,
        },
        {
            id: 'bruno',
            name: 'Bruno López',
            baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
            baseShift: 'NIGHT',
            role: 'SALES',
            isActive: true,
        },
        {
            id: 'carlos',
            name: 'Carlos Ruiz',
            baseSchedule: { 0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'OFF' },
            baseShift: 'NIGHT',
            role: 'SALES',
            isActive: true,
        },
    ]

    const mockCalendarDays: DayInfo[] = [
        { date: '2026-01-15', dayOfWeek: 4, kind: 'REGULAR' },
    ]

    it('calcula turnos base correctamente sin swaps', () => {
        const weeklyPlan: WeeklyPlan = {
            weekStart: '2026-01-12',
            agents: [
                {
                    representativeId: 'ana',
                    days: {
                        [date]: {
                            status: 'WORKING',
                            source: 'BASE',
                            assignment: { type: 'SINGLE', shift: 'DAY' },
                        },
                    },
                },
                {
                    representativeId: 'bruno',
                    days: {
                        [date]: {
                            status: 'WORKING',
                            source: 'BASE',
                            assignment: { type: 'SINGLE', shift: 'NIGHT' },
                        },
                    },
                },
            ],
        }

        const context = buildDailyEffectiveContext({
            date,
            weeklyPlan,
            swaps: [],
            incidents: [],
            allCalendarDays: mockCalendarDays,
            representatives: mockRepresentatives,
        })

        expect(context.daily['ana'].baseShifts).toEqual(new Set(['DAY']))
        expect(context.daily['ana'].effectiveShifts).toEqual(new Set(['DAY']))
        expect(context.daily['bruno'].baseShifts).toEqual(new Set(['NIGHT']))
        expect(context.daily['bruno'].effectiveShifts).toEqual(new Set(['NIGHT']))
    })

    it('calcula turnos efectivos después de un COVER', () => {
        const weeklyPlan: WeeklyPlan = {
            weekStart: '2026-01-12',
            agents: [
                {
                    representativeId: 'ana',
                    days: {
                        [date]: {
                            status: 'OFF',
                            source: 'BASE',
                            assignment: { type: 'NONE' },
                        },
                    },
                },
                {
                    representativeId: 'bruno',
                    days: {
                        [date]: {
                            status: 'WORKING',
                            source: 'BASE',
                            assignment: { type: 'SINGLE', shift: 'NIGHT' },
                        },
                    },
                },
            ],
        }

        const swaps: SwapEvent[] = [
            {
                id: 'swap1',
                type: 'COVER',
                date,
                shift: 'NIGHT',
                fromRepresentativeId: 'bruno',
                toRepresentativeId: 'ana',
            },
        ]

        const context = buildDailyEffectiveContext({
            date,
            weeklyPlan,
            swaps,
            incidents: [],
            allCalendarDays: mockCalendarDays,
            representatives: mockRepresentatives,
        })

        // Ana base: OFF, efectivo: NIGHT (cubre a Bruno)
        expect(context.daily['ana'].baseShifts).toEqual(new Set())
        expect(context.daily['ana'].effectiveShifts).toEqual(new Set(['NIGHT']))

        // Bruno base: NIGHT, efectivo: OFF (cubierto por Ana)
        expect(context.daily['bruno'].baseShifts).toEqual(new Set(['NIGHT']))
        expect(context.daily['bruno'].effectiveShifts).toEqual(new Set())
    })

    it('🚨 BUG CRÍTICO: detecta doble cobertura del mismo turno', () => {
        const weeklyPlan: WeeklyPlan = {
            weekStart: '2026-01-12',
            agents: [
                {
                    representativeId: 'ana',
                    days: {
                        [date]: {
                            status: 'OFF',
                            source: 'BASE',
                            assignment: { type: 'NONE' },
                        },
                    },
                },
                {
                    representativeId: 'bruno',
                    days: {
                        [date]: {
                            status: 'WORKING',
                            source: 'BASE',
                            assignment: { type: 'SINGLE', shift: 'NIGHT' },
                        },
                    },
                },
                {
                    representativeId: 'carlos',
                    days: {
                        [date]: {
                            status: 'WORKING',
                            source: 'BASE',
                            assignment: { type: 'SINGLE', shift: 'NIGHT' },
                        },
                    },
                },
            ],
        }

        // Ana cubre a Bruno (COVER #1)
        const swap1: SwapEvent = {
            id: 'swap1',
            type: 'COVER',
            date,
            shift: 'NIGHT',
            fromRepresentativeId: 'bruno',
            toRepresentativeId: 'ana',
        }

        // Contexto después del primer COVER
        const contextAfterSwap1 = buildDailyEffectiveContext({
            date,
            weeklyPlan,
            swaps: [swap1],
            incidents: [],
            allCalendarDays: mockCalendarDays,
            representatives: mockRepresentatives,
        })

        // Ana ahora trabaja NIGHT
        expect(contextAfterSwap1.daily['ana'].effectiveShifts).toEqual(new Set(['NIGHT']))

        // Ahora intentamos crear COVER #2: Ana cubre a Carlos
        const swap2: SwapEvent = {
            id: 'swap2',
            type: 'COVER',
            date,
            shift: 'NIGHT',
            fromRepresentativeId: 'carlos',
            toRepresentativeId: 'ana',
        }

        // Contexto después del segundo COVER (si se permitiera)
        const contextAfterSwap2 = buildDailyEffectiveContext({
            date,
            weeklyPlan,
            swaps: [swap1, swap2],
            incidents: [],
            allCalendarDays: mockCalendarDays,
            representatives: mockRepresentatives,
        })

        // 🔥 CRÍTICO: Ana sigue teniendo solo NIGHT
        // El segundo COVER no debería haber sido permitido
        // Este test documenta el bug: el contexto muestra que Ana YA trabaja NIGHT
        expect(contextAfterSwap2.daily['ana'].effectiveShifts).toEqual(new Set(['NIGHT']))

        // La validación DEBE usar este contexto para detectar que Ana ya trabaja NIGHT
        // y rechazar el segundo COVER
    })

    it('detecta bloqueo por VACACIONES', () => {
        const weeklyPlan: WeeklyPlan = {
            weekStart: '2026-01-12',
            agents: [
                {
                    representativeId: 'ana',
                    days: {
                        [date]: {
                            status: 'OFF',
                            source: 'INCIDENT',
                            type: 'VACACIONES',
                            assignment: { type: 'NONE' },
                        },
                    },
                },
            ],
        }

        const incidents: Incident[] = [
            {
                id: 'inc1',
                representativeId: 'ana',
                type: 'VACACIONES',
                startDate: '2026-01-15',
                duration: 14,
                createdAt: '2026-01-01T00:00:00Z',
            },
        ]

        const context = buildDailyEffectiveContext({
            date,
            weeklyPlan,
            swaps: [],
            incidents,
            allCalendarDays: mockCalendarDays,
            representatives: mockRepresentatives,
        })

        expect(context.daily['ana'].isBlocked).toBe(true)
        expect(context.daily['ana'].effectiveShifts).toEqual(new Set())
    })

    it('calcula correctamente con perfil BOTH', () => {
        const weeklyPlan: WeeklyPlan = {
            weekStart: '2026-01-12',
            agents: [
                {
                    representativeId: 'ana',
                    days: {
                        [date]: {
                            status: 'WORKING',
                            source: 'BASE',
                            assignment: { type: 'BOTH' },
                        },
                    },
                },
            ],
        }

        const context = buildDailyEffectiveContext({
            date,
            weeklyPlan,
            swaps: [],
            incidents: [],
            allCalendarDays: mockCalendarDays,
            representatives: mockRepresentatives,
        })

        expect(context.daily['ana'].baseShifts).toEqual(new Set(['DAY', 'NIGHT']))
        expect(context.daily['ana'].effectiveShifts).toEqual(new Set(['DAY', 'NIGHT']))
    })
})
