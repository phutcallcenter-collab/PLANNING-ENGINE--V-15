
import { createWeeklySnapshot } from './createWeeklySnapshot'
import { WeeklyPlan } from '@/domain/types'

// Mock dependencies
const representatives = [
    { id: 'REP_A', name: 'Rep A' },
    { id: 'REP_B', name: 'Rep B' }
]

const plan: WeeklyPlan = {
    weekStart: '2026-02-02',
    agents: [
        {
            representativeId: 'REP_A', // covering
            days: {
                '2026-02-02': {
                    status: 'OFF',
                    assignment: { type: 'SINGLE', shift: 'DAY' },
                    badge: 'CUBRIENDO',
                    source: 'BASE'
                }
            }
        },
        {
            representativeId: 'REP_B', // owner
            days: {
                '2026-02-02': {
                    status: 'OFF',
                    assignment: { type: 'SINGLE', shift: 'DAY' },
                    badge: 'CUBIERTO',
                    source: 'BASE'
                }
            }
        }
    ]
}

const mockCoverage = {
    id: 'cov-hostile-1',
    date: '2026-02-02',
    shift: 'DAY',
    coveredRepId: 'REP_B',
    coveringRepId: 'REP_A',
    status: 'ACTIVE'
}

console.log('Running Debug Script...')
try {
    const snapshot = createWeeklySnapshot(plan, '2026-02-02', 'TEST', [mockCoverage as any], representatives as any)

    const repA = snapshot.byRepresentative.find(r => r.repId === 'REP_A')!
    const repB = snapshot.byRepresentative.find(r => r.repId === 'REP_B')!

    console.log('--- REP A ---')
    console.log(JSON.stringify(repA, null, 2))
    console.log('--- REP B ---')
    console.log(JSON.stringify(repB, null, 2))
    console.log('--- TOTALS ---')
    console.log(JSON.stringify(snapshot.totals, null, 2))

} catch (e) {
    console.error('ERROR:', e)
}
