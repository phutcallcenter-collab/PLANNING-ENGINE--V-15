/**
 * ⚠️ HARDENED MODULE - AUDIT RECORDER
 * ------------------------------------
 * This is the single, hardened entry point for writing audit events.
 *
 * Rules:
 * - Audit events are NEVER derived or modified after creation.
 * - ID and timestamp are ALWAYS generated here.
 * - This function is pure regarding its inputs, with the controlled
 *   side effect of mutating the Immer draft state.
 *
 * Any write to `auditLog` outside this function is a critical violation.
 */

import type { Draft } from 'immer'
import type { PlanningBaseState } from '../types'
import type { AuditEvent } from './types'

export function recordAuditEvent(
  state: Draft<PlanningBaseState>,
  event: Omit<AuditEvent, 'id' | 'timestamp'>
): void {
  const auditEvent: AuditEvent = {
    id: `audit-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...event,
  }

  // Prepend to keep newest-first ordering, which is efficient for logs.
  state.auditLog.unshift(auditEvent)
}
