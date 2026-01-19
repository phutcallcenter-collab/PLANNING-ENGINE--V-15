'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type AccordionItem = {
    id: string
    title: string
    content: React.ReactNode
}

export function Accordion({
    items,
}: {
    items: AccordionItem[]
}) {
    const [openId, setOpenId] = useState<string | null>('what-is')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {items.map(item => {
                const isOpen = openId === item.id

                return (
                    <div
                        key={item.id}
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-sm)',
                            overflow: 'hidden',
                        }}
                    >
                        <button
                            onClick={() => setOpenId(isOpen ? null : item.id)}
                            style={{
                                width: '100%',
                                padding: 'var(--space-md)',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-base)',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            {item.title}
                            <span style={{ color: 'var(--text-muted)' }}>
                                {isOpen ? '−' : '+'}
                            </span>
                        </button>

                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                >
                                    <div
                                        style={{
                                            padding: '0 var(--space-md) var(--space-md)',
                                            color: 'var(--text-muted)',
                                            fontSize: 'var(--font-size-sm)',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {item.content}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )
            })}
        </div>
    )
}

export function QuickGuide() {
    return (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2
                style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                    marginBottom: 'var(--space-xs)',
                    color: 'var(--text-main)',
                }}
            >
                Guía Rápida <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 400, color: 'var(--text-muted)' }}>(léela una vez)</span>
            </h2>

            <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-md)',
                marginTop: 0
            }}>
                Esta guía explica qué hace cada pantalla y qué se espera de ti. No necesitas aprender el sistema. Solo usarlo correctamente.
            </p>

            <Accordion
                items={[
                    {
                        id: 'what-is',
                        title: '¿Qué es Control Operativo?',
                        content: (
                            <>
                                Control Operativo registra hechos reales y muestra su impacto.
                                <br /><br />
                                No predice.
                                <br />
                                No corrige decisiones.
                                <br />
                                No interpreta intenciones.
                                <br /><br />
                                Muestra datos tal como fueron registrados.
                            </>
                        ),
                    },
                    {
                        id: 'daily-log',
                        title: 'Registro Diario (uso principal)',
                        content: (
                            <>
                                Aquí se registran hechos que ocurrieron HOY.
                                <br /><br />
                                <strong style={{ color: 'var(--text-main)' }}>Uso típico:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Selecciona a la persona.</li>
                                    <li>Selecciona el tipo de incidencia.</li>
                                    <li>Confirma el registro.</li>
                                </ul>
                                <strong style={{ color: 'var(--text-main)' }}>El sistema guarda:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Fecha y hora.</li>
                                    <li>Persona afectada.</li>
                                    <li>Tipo de incidencia.</li>
                                    <li>Impacto en cobertura (si aplica).</li>
                                </ul>
                                <strong style={{ color: 'var(--text-main)' }}>Correcciones rápidas</strong>
                                <br />
                                Al registrar una incidencia aparece <strong>Deshacer</strong> durante unos segundos.
                                <br />
                                Pasado ese tiempo, el registro queda fijo y solo puede corregirse usando Edición Avanzada.
                            </>
                        ),
                    },
                    {
                        id: 'planning',
                        title: 'Planificación (organizar el futuro)',
                        content: (
                            <>
                                Aquí se define lo que debería ocurrir en días futuros.
                                <br /><br />
                                <strong style={{ color: 'var(--text-main)' }}>Se usa para:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Turnos.</li>
                                    <li>Vacaciones.</li>
                                    <li>Licencias.</li>
                                    <li>Cobertura esperada.</li>
                                </ul>
                                <strong style={{ color: 'var(--text-main)' }}>Reglas importantes:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Respeta feriados automáticamente.</li>
                                    <li>Calcula días laborables sin intervención manual.</li>
                                    <li>Indicadores rojos significan falta de personal, no errores del sistema.</li>
                                </ul>
                            </>
                        ),
                    },
                    {
                        id: 'reports',
                        title: 'Reportes (consulta y respaldo)',
                        content: (
                            <>
                                Esta sección es solo de lectura.
                                <br /><br />
                                <strong style={{ color: 'var(--text-main)' }}>Se usa para:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Ver resúmenes mensuales.</li>
                                    <li>Consultar puntos e incidencias.</li>
                                    <li>Revisar historial.</li>
                                </ul>
                                Los datos aquí mostrados no se modifican.
                                <br />
                                Sirven como respaldo operativo y administrativo.
                            </>
                        ),
                    },
                    {
                        id: 'advanced',
                        title: 'Edición avanzada (uso excepcional)',
                        content: (
                            <>
                                <strong style={{ color: '#ef4444' }}>Uso excepcional.</strong>
                                <br /><br />
                                <strong style={{ color: 'var(--text-main)' }}>Permite:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Corregir registros pasados.</li>
                                    <li>Ajustar información ya cerrada.</li>
                                </ul>
                                <strong style={{ color: 'var(--text-main)' }}>Reglas claras:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <li>Nada se elimina sin dejar rastro.</li>
                                    <li>Toda acción queda registrada.</li>
                                    <li>No es parte del trabajo diario.</li>
                                </ul>
                                Si no sabes si debes usarla, no la uses.
                            </>
                        ),
                    },
                ]}
            />
        </section>
    )
}
