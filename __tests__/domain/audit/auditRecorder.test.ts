import { recordAuditEvent } from '../../../src/domain/audit/auditRecorder'
import type { AuditEvent } from '../../../src/domain/audit/types'
import { produce } from 'immer'
import type { PlanningBaseState } from '@/domain/types'
import { createInitialState } from '@/domain/state'

describe('Domain Rules: Audit Recorder', () => {
  let baseState: PlanningBaseState

  beforeEach(() => {
    baseState = createInitialState()
  })

  it('adds a valid event with ID and timestamp to the state', () => {
    const nextState = produce(baseState, draft => {
      recordAuditEvent(draft, {
        actor: { id: 'admin', name: 'Admin' },
        action: 'INCIDENT_CREATED',
        target: { entity: 'INCIDENT', entityId: 'inc-1' },
      })
    })

    expect(nextState.auditLog.length).toBe(1)
    const event = nextState.auditLog[0]
    expect(event.id).toMatch(/^audit-/)
    expect(new Date(event.timestamp).getFullYear()).toBe(
      new Date().getFullYear()
    )
    expect(event.action).toBe('INCIDENT_CREATED')
  })

  it('prepends new events, keeping the log chronologically inverse', () => {
    const finalState = produce(baseState, draft => {
      recordAuditEvent(draft, {
        action: 'INCIDENT_CREATED',
        target: { entity: 'INCIDENT' },
        actor: { id: 'test', name: 'Test' },
      })
      recordAuditEvent(draft, {
        action: 'OVERRIDE_APPLIED',
        target: { entity: 'PLANNING' },
        actor: { id: 'test', name: 'Test' },
      })
    })

    expect(finalState.auditLog.length).toBe(2)
    expect(finalState.auditLog[0].action).toBe('OVERRIDE_APPLIED')
    expect(finalState.auditLog[1].action).toBe('INCIDENT_CREATED')
  })

  it('does not mutate the original state object', () => {
    const originalState = createInitialState()
    const frozenState = structuredClone(originalState)

    produce(originalState, draft => {
      recordAuditEvent(draft, {
        action: 'APP_STATE_RESET',
        target: { entity: 'SYSTEM' },
        actor: { id: 'test', name: 'Test' },
      })
    })

    expect(originalState).toEqual(frozenState)
  })

  it('correctly includes change and context when provided', () => {
    const finalState = produce(baseState, draft => {
      recordAuditEvent(draft, {
        actor: { id: 'u1', name: 'Admin' },
        action: 'OVERRIDE_APPLIED',
        target: { entity: 'PLANNING' },
        change: { field: 'status', from: 'OFF', to: 'WORKING' },
        context: { date: '2025-01-10', reason: 'Cobertura crítica' },
      })
    })

    const event = finalState.auditLog[0]
    expect(event.change?.to).toBe('WORKING')
    expect(event.context?.reason).toBe('Cobertura crítica')
  })

  it('does not add unexpected fields to the event', () => {
    const finalState = produce(baseState, draft => {
      recordAuditEvent(draft, {
        actor: { id: 'u1', name: 'Admin' },
        action: 'DATA_EXPORTED',
        target: { entity: 'SYSTEM' },
      })
    })

    expect(Object.keys(finalState.auditLog[0]).sort()).toEqual([
      'action',
      'actor',
      'change',
      'context',
      'id',
      'target',
      'timestamp',
    ])
  })
})
