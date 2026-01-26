/**
 * 🔄 COVERAGE STORE (Zustand + Persist + Versioned)
 * 
 * Manages Coverage entities with localStorage persistence and schema migrations.
 * 
 * CRITICAL RULES:
 * - Persists Coverage[] to localStorage
 * - Cancel = status: 'CANCELLED' (no deletes)
 * - No domain logic here
 * - Explicit versioning for safe migrations
 * - Unknown versions → hard reset (safe fail)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Coverage } from '@/domain/planning/coverage'
import { ISODate, RepresentativeId } from '@/domain/types'
import { ShiftType } from '@/domain/calendar/types'
import { nanoid } from 'nanoid'
import { useAuditStore } from './useAuditStore'

const COVERAGE_STORE_VERSION = 1

interface CoveragePersistedState {
    coverages: Coverage[]
}

interface CoverageState extends CoveragePersistedState {
    createCoverage: (input: {
        date: ISODate
        shift: ShiftType
        coveredRepId: RepresentativeId
        coveringRepId: RepresentativeId
        note?: string
    }) => Coverage

    cancelCoverage: (coverageId: string) => void

    getCoverageById: (id: string) => Coverage | undefined

    getActiveCoverages: () => Coverage[]
}

export const useCoverageStore = create<CoverageState>()(
    persist(
        (set, get) => ({
            coverages: [],

            createCoverage: (input) => {
                // ✅ VALIDATION: Check for existing active coverage
                const existingCoverage = get().coverages.find(c =>
                    c.status === 'ACTIVE' &&
                    c.date === input.date &&
                    c.shift === input.shift &&
                    c.coveredRepId === input.coveredRepId
                )

                if (existingCoverage) {
                    throw new Error(
                        `Ya existe una cobertura activa para esta persona en ${input.shift === 'DAY' ? 'Día' : 'Noche'} el ${input.date}. ` +
                        `Cancela la cobertura existente primero.`
                    )
                }

                const coverage: Coverage = {
                    id: nanoid(),
                    date: input.date,
                    shift: input.shift,
                    coveredRepId: input.coveredRepId,
                    coveringRepId: input.coveringRepId,
                    note: input.note,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString()
                }

                set(state => ({
                    coverages: [...state.coverages, coverage]
                }))

                // 🔍 AUDIT: Coverage Created
                useAuditStore.getState().appendEvent({
                    type: 'COVERAGE_CREATED',
                    actor: 'SYSTEM',
                    payload: {
                        entity: { type: 'COVERAGE', id: coverage.id },
                        date: input.date,
                        shift: input.shift,
                        coveredRepId: input.coveredRepId,
                        coveringRepId: input.coveringRepId,
                        note: input.note
                    }
                })

                return coverage
            },

            cancelCoverage: (coverageId) => {
                set(state => ({
                    coverages: state.coverages.map(c =>
                        c.id === coverageId
                            ? { ...c, status: 'CANCELLED' as const }
                            : c
                    )
                }))

                // 🔍 AUDIT: Coverage Cancelled
                useAuditStore.getState().appendEvent({
                    type: 'COVERAGE_CANCELLED',
                    actor: 'SYSTEM',
                    payload: {
                        entity: { type: 'COVERAGE', id: coverageId },
                        reason: 'USER_ACTION'
                    }
                })
            },

            getCoverageById: (id) => {
                return get().coverages.find(c => c.id === id)
            },

            getActiveCoverages: () => {
                return get().coverages.filter(c => c.status === 'ACTIVE')
            }
        }),
        {
            name: 'coverage-store',
            version: COVERAGE_STORE_VERSION,
            skipHydration: false, // Explicit: expect automatic rehydration from localStorage

            migrate: (persistedState, version) => {
                console.info(
                    '[CoverageStore] Migrating from version',
                    version,
                    '→',
                    COVERAGE_STORE_VERSION
                )

                // 🟢 FUTURE-PROOF: explicit migration steps
                if (version === 0) {
                    const state = persistedState as any

                    return {
                        coverages: Array.isArray(state.coverages)
                            ? state.coverages
                            : [],
                    }
                }

                // 🧨 UNKNOWN VERSION → HARD RESET (SAFE FAIL)
                if (version !== COVERAGE_STORE_VERSION) {
                    console.warn(
                        '[CoverageStore] Unknown version, resetting store'
                    )

                    return {
                        coverages: [],
                    }
                }

                return persistedState as CoveragePersistedState
            },
        }
    )
)
