# Blueprint — Planning Engine v2.0

Este documento define el contrato arquitectónico definitivo del motor de planificación en su versión v2.0. Describe qué es el sistema, qué hace, qué no hace, y por qué. Cualquier modificación futura deberá respetar este documento o justificar explícitamente su ruptura.

## 1. Propósito del Sistema

El sistema tiene dos responsabilidades primarias y separadas:
1.  **Planificar**: Producir un **plan de trabajo válido y preferido** basado en un conjunto de reglas. Responde a: "¿Quién debería trabajar?".
2.  **Registrar**: Mantener un **registro histórico de incidencias** que ocurrieron en la realidad. Responde a: "¿Qué pasó realmente?".

## 2. Filosofía Fundamental

- **Determinismo Absoluto**: Mismo input, mismo output. Siempre.
- **Separación Estricta de Responsabilidades**: Planificación (`WeeklyPlan`), Registro (`Incident`) y Orquestación de UI (`AppShell`) son capas distintas.
- **Corrección Antes que Optimalidad**: Un plan y un registro correctos son la base.

## 3. Conceptos Fundamentales

### 3.1 Incidencias (`Incident`)
Representan **eventos reales** que ocurrieron y se registran en el **Registro Diario**.
- **Tipos**: `TARDANZA`, `AUSENCIA`, `LICENCIA`, `VACACIONES`, `ERROR`, `OTRO`.
- **Jerarquía de Reglas**:
    - Una `AUSENCIA` es la incidencia de mayor prioridad. Si existe para un representante en una fecha, anula cualquier otro estado y prohíbe el registro de otras incidencias para esa persona ese día.
    - `LICENCIA` y `VACACIONES` son la segunda prioridad. Bloquean el día como `OFF` y no se pueden modificar con `overrides`.
- **Registro**: Todas las incidencias se crean exclusivamente desde la vista de **Registro Diario**.

### 3.2 Overrides de Planificación
Son **modificaciones al plan base**, no eventos históricos. Viven exclusivamente en la vista de **Planificación**.
- **Única Función**: Alternar el estado de un representante para un día específico entre `WORKING` y `OFF`.
- **Lógica**: Se implementa como una incidencia interna de tipo `OVERRIDE`, pero es invisible para el usuario fuera de la vista de planificación.
- **Restricción**: No se puede aplicar un `override` a un día que ya está afectado por una `LICENCIA` o `VACACIONES`.

### 3.3 Motor de Planificación (`buildWeeklySchedule`)
El motor genera el estado visual del plan semanal. Para cada `slot` (celda):
1.  **Verifica `AUSENCIA`**: Si hay una `AUSENCIA`, el estado es `OFF` (con estilo visual de ausencia). Fin del proceso para esta celda.
2.  **Verifica `LICENCIA`/`VACACIONES`**: Si aplica, el estado es `OFF` (con estilo visual de incidencia). La celda se bloquea.
3.  **Verifica `OVERRIDE`**: Si existe, invierte el estado base (`WORKING` a `OFF` o viceversa).
4.  **Aplica Estado Base**: Si no hay ninguna de las anteriores, se usa el `baseSchedule` del representante.

## 4. Arquitectura de Vistas (UI)

La interfaz se organiza en pestañas, donde cada una renderiza una vista principal de forma exclusiva.
- **`Planificación`**: Muestra la grilla semanal (`PlanView`), permite `overrides` y gestiona las reglas de cobertura. NO permite registrar incidencias.
- **`Registro Diario`**: Muestra el formulario para crear incidencias y la lista de eventos del día seleccionado. NO muestra la planificación.
- **Otras Vistas (`Mensual`, `Estadísticas`)**: Marcadores de posición para funcionalidades futuras.

## 5. Garantías del Sistema (v2.0)

- ✔️ **Validez por Construcción**: Ninguna asignación viola las reglas de jerarquía de incidencias.
- ✔️ **Responsabilidad Única**: La vista de `Planificación` planifica; la de `Registro Diario` registra. No hay solapamiento.
- ✔️ **Determinismo y Reproducibilidad**: El plan y el registro son siempre los mismos para un mismo input.
- ✔️ **Extensibilidad**: Se pueden añadir nuevas `ScoringRules` sin modificar el motor. La lógica de incidencias está centralizada.

## 6. Estado del Proyecto

- **Estado actual**: `v2.0 – Operational Core`
- **Comportamiento Congelado**: El flujo de Planificación vs. Registro está cerrado. La jerarquía de incidencias es definitiva.
- **Contrato**: Los tests y este documento definen el comportamiento esperado.

## 7. Próximos Pasos Posibles

- **SoftRules Avanzadas**: Equidad, balance de carga, preferencias complejas.
- **Introspección / Explicabilidad**: Un mecanismo para consultar por qué se tomó una decisión (`explain plan`).
- **Motor de Simulación**: Ejecutar el planificador sobre escenarios hipotéticos.
