import { isSlotOperationallyEmpty } from './isSlotOperationallyEmpty'

describe('Slot Operational Truth', () => {
    const date = '2025-01-20'
    const shift = 'DAY'

    it('marks slot empty on direct absence', () => {
        const incidents = [{
            type: 'AUSENCIA',
            representativeId: 'LUZ',
            startDate: date
        } as any]

        expect(
            isSlotOperationallyEmpty('LUZ', date, shift, incidents)
        ).toBe(true)
    })

    it('marks slot empty on coverage failure', () => {
        const incidents = [{
            type: 'AUSENCIA',
            representativeId: 'EMELY',
            source: 'COVERAGE',
            slotOwnerId: 'LUZ',
            startDate: date
        } as any]

        expect(
            isSlotOperationallyEmpty('LUZ', date, shift, incidents)
        ).toBe(true)
    })

    it('does NOT mark slot empty if no relevant absence exists', () => {
        expect(
            isSlotOperationallyEmpty('LUZ', date, shift, [])
        ).toBe(false)
    })

    it('does NOT mark slot empty if absence belongs to someone else (no link)', () => {
        const incidents = [{
            type: 'AUSENCIA',
            representativeId: 'EMELY',
            source: 'BASE', // Not coverage
            startDate: date
        } as any]

        expect(
            isSlotOperationallyEmpty('LUZ', date, shift, incidents)
        ).toBe(false)
    })
})
