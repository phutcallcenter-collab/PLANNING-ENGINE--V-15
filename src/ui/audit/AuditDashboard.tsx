'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useAuditStore } from '@/store/useAuditStore'
import { useWeeklySnapshotStore } from '@/store/useWeeklySnapshotStore'
import { AuditTimeline } from './AuditTimeline'
import { useAppStore } from '@/store/useAppStore'
import { useCoverageStore } from '@/store/useCoverageStore'
import { createWeeklySnapshot } from '@/application/audit/createWeeklySnapshot'
import { signSnapshotChain } from '@/application/audit/signSnapshotChain'
import { verifySnapshotChain } from '@/application/audit/verifySnapshotChain'
import { buildWeeklySchedule } from '@/domain/planning/buildWeeklySchedule'
import { format, parseISO, addDays } from 'date-fns'
import { SignedWeeklySnapshot } from '@/domain/audit/SignedWeeklySnapshot'

function SnapshotCard({ snapshot, allSnapshots }: { snapshot: SignedWeeklySnapshot, allSnapshots: SignedWeeklySnapshot[] }) {
    const [isValid, setIsValid] = useState<boolean | null>(null)

    useEffect(() => {
        // 🔒 STRICT CHAIN VERIFICATION
        // Find the actual parent in the whole chain by signature, not list order.
        const prev = snapshot.previousSignature
            ? allSnapshots.find(s => s.signature === snapshot.previousSignature)
            : undefined

        verifySnapshotChain(snapshot, prev).then(setIsValid)
    }, [snapshot, allSnapshots])

    return (
        <div
            style={{
                border: '1px solid',
                borderColor: isValid === false ? '#ef4444' : '#e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                background: isValid === false ? '#fef2f2' : '#f9fafb',
                position: 'relative'
            }}
        >
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                {isValid === true && <span title="Cadena Válida" style={{ fontSize: '16px' }}>🔗✅</span>}
                {isValid === false && <span title="Cadena Rota!" style={{ fontSize: '16px' }}>🔗⛔ BROKEN</span>}
                {isValid === null && <span style={{ fontSize: '16px' }}>⏳</span>}
            </div>

            <strong style={{ display: 'block', marginBottom: '4px' }}>
                Semana {snapshot.snapshot.isoWeek} <span style={{ fontWeight: 400, color: '#6b7280' }}>({format(parseISO(snapshot.snapshot.weekStart), 'd MMM yyyy')} – {format(parseISO(snapshot.snapshot.weekEnd), 'd MMM yyyy')})</span>
                {snapshot.sealed && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#374151', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>SELLADO</span>}
            </strong>

            <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                Slots Planificados: <strong>{snapshot.snapshot.totals.plannedSlots}</strong> ·
                Ejecutados (presencia efectiva): <strong>{snapshot.snapshot.totals.executedSlots}</strong> ·
                Ausencias: <strong>{snapshot.snapshot.totals.absenceSlots}</strong> ·
                Coberturas: <strong>{snapshot.snapshot.totals.coverageSlots}</strong> ·
                <span style={{ color: snapshot.snapshot.totals.uncoveredSlots > 0 ? '#ef4444' : 'inherit', fontWeight: snapshot.snapshot.totals.uncoveredSlots > 0 ? 700 : 400 }}>
                    Sin Cubrir: {snapshot.snapshot.totals.uncoveredSlots}
                </span>
            </div>

            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                SIG: {snapshot.signature.slice(0, 16)}...
                {snapshot.previousSignature && (
                    <div style={{ color: '#d1d5db' }}>PREV: {snapshot.previousSignature.slice(0, 16)}...</div>
                )}
            </div>
        </div>
    )
}

export function AuditDashboard() {
    const events = useAuditStore(s => s.events)
    const { snapshots, addSnapshot, getLatestSnapshot } = useWeeklySnapshotStore(s => ({
        snapshots: s.snapshots,
        addSnapshot: s.addSnapshot,
        getLatestSnapshot: s.getLatestSnapshot
    }))

    const { representatives, incidents, specialSchedules, allCalendarDaysForRelevantMonths, planningAnchorDate, swaps } = useAppStore(s => ({
        representatives: s.representatives,
        incidents: s.incidents,
        specialSchedules: s.specialSchedules,
        allCalendarDaysForRelevantMonths: s.allCalendarDaysForRelevantMonths,
        planningAnchorDate: s.planningAnchorDate,
        swaps: s.swaps
    }))

    const coverages = useCoverageStore(s => s.coverages)

    const orderedSnapshots = useMemo(
        () => [...snapshots].sort((a, b) => {
            // Primary: Week (Newest first)
            const weekDiff = b.snapshot.weekStart.localeCompare(a.snapshot.weekStart)
            if (weekDiff !== 0) return weekDiff

            // Secondary: Creation Time (Newest first) if available, or assume insertion order implies time
            // We can check if `createdAt` exists in snapshot (it does)
            return b.snapshot.createdAt.localeCompare(a.snapshot.createdAt)
        }),
        [snapshots]
    )

    const [isSnapshotting, setIsSnapshotting] = useState(false)

    const handleCreateSnapshot = async () => {
        setIsSnapshotting(true)
        try {
            // 1. Calculate Plan for Current Anchor Date
            const weekStart = planningAnchorDate // Assuming anchor is Monday
            const start = parseISO(weekStart)

            const days = []
            for (let i = 0; i < 7; i++) {
                const dStr = format(addDays(start, i), 'yyyy-MM-dd')
                const found = allCalendarDaysForRelevantMonths.find(d => d.date === dStr)
                if (found) days.push(found)
            }

            if (days.length < 7) {
                alert('No se puede generar snapshot: faltan datos de calendario para esta semana.')
                return
            }

            const plan = buildWeeklySchedule(
                representatives,
                incidents,
                specialSchedules,
                days,
                allCalendarDaysForRelevantMonths
            )

            // 2. Create Snapshot Domain Object
            const snapshot = createWeeklySnapshot(plan, weekStart, 'SYSTEM', coverages, representatives)

            // 3. 🔗 CHAIN LOGIC: Get Previous Signature
            const latest = getLatestSnapshot()
            const previousSignature = latest ? latest.signature : null

            // 4. Sign with Chain
            const signature = await signSnapshotChain(snapshot, previousSignature ?? null)

            // 5. Create Signed Object
            const signedSnapshot: SignedWeeklySnapshot = {
                snapshot,
                signature,
                previousSignature: previousSignature ?? undefined,
                sealed: true, // Manual Trigger = Auto Seal
                sealedAt: new Date().toISOString(),
                sealedBy: 'USER_MANUAL' // This would be the admin user ID in real app
            }

            // 6. Save to Store (Store will re-verify chain)
            const success = await addSnapshot(signedSnapshot)

            if (success) {
                // Log Audit Event for the Snapshot Creation itself
                useAuditStore.getState().appendEvent({
                    type: 'SNAPSHOT_CREATED',
                    actor: 'USER',
                    payload: {
                        week: weekStart,
                        signature: signature,
                        isSealed: true
                    }
                })
            } else {
                alert('Error crítico: El snapshot fue rechazado por violación de integridad de cadena.')
            }

        } catch (e) {
            console.error(e)
            alert('Error generando snapshot')
        } finally {
            setIsSnapshotting(false)
        }
    }

    // Adapter for Timeline
    const timelineItems = useMemo(() => {
        // We already have a specific adapter mapAuditEventsToTimeline, stick to raw for now or use that?
        // Using simple mapping for now to avoid circular ref or complexity
        return events
            .slice()
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .map(e => ({
                id: e.id,
                timestamp: e.timestamp,
                type: e.type,
                actor: e.actor,
                summary: e.type, // Simplification
                payload: e.payload
            }))
    }, [events])

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Timeline */}
            <section>
                <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Timeline de eventos</h3>
                <AuditTimeline items={timelineItems} />
            </section>

            {/* Snapshots */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontWeight: 600, margin: 0 }}>Snapshots Semanales (Blockchain-lite)</h3>
                    <button
                        onClick={handleCreateSnapshot}
                        disabled={isSnapshotting}
                        style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        {isSnapshotting ? 'Generando...' : '📷 Sellar Semana Actual'}
                    </button>
                </div>

                {orderedSnapshots.length === 0 && <p style={{ color: '#6b7280', fontSize: '14px' }}>No hay snapshots registrados.</p>}

                {orderedSnapshots.map((s) => {
                    // Pass ALL snapshots to the card so it can perform forensic lookup by signature
                    return <SnapshotCard key={s.snapshot.id} snapshot={s} allSnapshots={snapshots} />
                })}
            </section>
        </div>
    )
}
