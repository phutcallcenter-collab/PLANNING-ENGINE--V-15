/**
 * 👥 REPRESENTATIVE STORE (Zustand)
 * 
 * Manages Representative entities in memory.
 * 
 * CRITICAL RULES:
 * - Only persists Representative[]
 * - Read-only for Coverage UI (CRUD happens elsewhere)
 * - Provides lookup functions for UI
 */

import { create } from 'zustand'
import { Representative, RepresentativeId } from '@/domain/types'

interface RepresentativeState {
    representatives: Representative[]

    getRepresentativeById: (id: RepresentativeId) => Representative | undefined

    setRepresentatives: (reps: Representative[]) => void

    addRepresentative: (rep: Representative) => void

    updateRepresentative: (id: RepresentativeId, updates: Partial<Representative>) => void

    removeRepresentative: (id: RepresentativeId) => void
}

export const useRepresentativeStore = create<RepresentativeState>((set, get) => ({
    representatives: [],

    getRepresentativeById: (id) => {
        return get().representatives.find(r => r.id === id)
    },

    setRepresentatives: (reps) => {
        set({ representatives: reps })
    },

    addRepresentative: (rep) => {
        set(state => ({
            representatives: [...state.representatives, rep]
        }))
    },

    updateRepresentative: (id, updates) => {
        set(state => ({
            representatives: state.representatives.map(r =>
                r.id === id ? { ...r, ...updates } : r
            )
        }))
    },

    removeRepresentative: (id) => {
        set(state => ({
            representatives: state.representatives.filter(r => r.id !== id)
        }))
    }
}))
