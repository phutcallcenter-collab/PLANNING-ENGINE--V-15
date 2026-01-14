# Planning Engine V15

Este repositorio aloja el **Motor de Planificación y Control de Puntos (V15)**, un sistema robusto diseñado para la gestión determinista de turnos, incidencias y cobertura operativa.

El sistema ha evolucionado hacia una arquitectura de **Domain-Driven Design (DDD)**, priorizando la corrección, la trazabilidad y la estabilidad operativa.

---

## 🎯 Objetivo del Sistema

Proporcionar una plataforma unificada para:
1.  **Planificación:** Definir esquemas de turnos semanales y mensuales.
2.  **Gestión de Cobertura:** Validar en tiempo real que se cumplan los requerimientos operativos (Deficit/Risk analysis).
3.  **Registro de Incidencias:** Captura precisa de eventos (tardanzas, ausencias, licencias) con impacto inmediato en métricas.
4.  **Reportes Ejecutivos:** KPIS de rendimiento, puntuación de staff y análisis de tendencias.

---

## 🏗 Arquitectura y Tecnología

El proyecto está construido sobre un stack moderno y tipado:

-   **Core:** Next.js (App Ecosystem) + TypeScript 5.
-   **Estado:** Zustand (Store centralizado con selectores optimizados).
-   **Diseño:** CSS-in-JS / Módulos de UI personalizados (sin dependencia excesiva de frameworks UI pesados).
-   **Testing:** Jest (Tests unitarios y de integración para reglas de dominio).

### Estructura de Módulos (DDD)
-   `src/domain`: Reglas de negocio puras, invariables y agnósticas de la UI (e.g., `validateSwapOperation`, `resolveIncidentDates`).
-   `src/application`: Casos de uso y adaptadores.
-   `src/store`: Gestión de estado reactivo.
-   `src/ui`: Componentes de presentación y contenedores lógicos.

---

## 🛡️ Estado de Calidad y Estabilidad

**Versión Actual: V15 (Production Release)**

El sistema ha sido sometido a un proceso riguroso de estabilización ("Sealing Domain Contracts"):

-   **Build:** ✅ **Clean Build** (Exit Code 0). Compatible con Vercel.
-   **Tests:** ✅ **97.7% de cobertura en módulos críticos**.
    -   Módulos de validación de Swaps, Cobertura y Schedule están "sellados" (Tests como fuente de verdad).
-   **Tipado:** Strict TypeScript compliance. Se han eliminado ambigüedades (`any`, `unknown`) en los flujos críticos.

---

## 🧠 Principios de Diseño

1.  **Verdad Única:** El estado "efectivo" de un día se calcula derivando: `Plan Base + Incidencias + Swaps`. No hay "doble contabilidad".
2.  **Validación Estricta:** Las operaciones de cambio de turno (Swaps, Covers) pasan por un validador de dominio que impide estados ilegales (e.g., asignar turno a alguien de vacaciones).
3.  **Transparencia:** Cada decisión del motor es explicable. El reporte ejecutivo muestra no solo *qué* pasó, sino el impacto (puntos) de cada evento.

---

## 🚀 Despliegue

El proyecto está configurado para despliegue continuo en **Vercel**.
Para generar una build de producción localmente:

```bash
npm run build
# Output esperado: Clean build con artifacts optimizados.
```

---

> _"La corrección es la característica número uno. El rendimiento es la segunda."_
