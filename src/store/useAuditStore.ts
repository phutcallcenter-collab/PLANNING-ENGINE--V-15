import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuditEvent } from '@/domain/audit/types'
import { nanoid } from 'nanoid'

interface AuditState {
    events: AuditEvent[]
    appendEvent: (event: Omit<AuditEvent, 'id' | 'timestamp'>) => void
}

export const useAuditStore = create<AuditState>()(
    persist(
        (set) => ({
            events: [],
            appendEvent: (event) =>
                set((state) => ({
                    events: [
                        ...state.events,
                        {
                            id: nanoid(),
                            type: event.type,
                            timestamp: new Date().toISOString(),
                            actor: event.actor,
                            repId: event.repId,
                            payload: event.payload
                        },
                    ],
                })),
        }),
        {
            name: 'audit-store',
            version: 1,
        }
    )
)
