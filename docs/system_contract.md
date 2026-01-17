# CONTRATO INTEGRAL DEL SISTEMA (CANÓNICO) - FASE 0

Objetivo:
Definir una sola verdad, responsabilidades claras y límites duros para que la implementación de swaps/coberturas no vuelva a romper el sistema.

Este documento es ley. No es sugerencia.

## 0.1 — CAPAS DEL SISTEMA (SOBERANÍA)

### 🟦 1. Dominio (Domain)
Decide la verdad.
No conoce UI. No conoce Zustand. No conoce React.

*   Qué día alguien debía trabajar
*   Qué turno cuenta
*   Quién es responsable punitivamente

📌 **Aquí vive la lógica peligrosa**

### 🟩 2. Store (Estado)
Solo almacena hechos.

*   weeklyPlan
*   incidents
*   swaps

📌 **Nunca decide nada**

### 🟨 3. UI
Solo pregunta y muestra.

*   “¿Quién debía trabajar hoy?”
*   “¿A quién le pongo la falta?”
*   “¿Qué barras dibujo?”

📌 **Si la UI decide lógica → bug**

## 0.2 — FUENTES DE VERDAD (UNA POR CONCEPTO)

| Concepto | Fuente ÚNICA |
| :--- | :--- |
| Semana actual | `useWeekNavigator` |
| Plan base | `weeklyPlan` |
| Operación diaria | `SwapEvent[]` |
| **Verdad efectiva** | **`resolveEffectiveDuty()`** |
| Castigo | Incidencias basadas en verdad efectiva |

❌ Nunca mezclar
❌ Nunca recalcular semanas
❌ Nunca inferir desde UI

## 0.3 — DEFINICIÓN CLAVE (ESTO TE SALVA)
❗ **Diferencia CRÍTICA**

### 🧱 Pertenencia (Identidad)
Qué turno es estructuralmente de una persona.

*   Se calcula solo con `weeklyPlan`
*   Es semanal
*   Nunca cambia por swaps

📌 **Usado para:**
*   Quién aparece en la grilla
*   Quién cuenta para “Total Día / Noche”

### ⚙️ Responsabilidad (Operación)
Qué debía trabajar ese día específico.

*   Se calcula con:
    *   Plan base
    *   `swaps`
*   Es diaria
*   Es la única que importa para castigos

📌 **Usado para:**
*   Incidencias
*   Cobertura
*   Déficits
*   Tooltips

👉 **Regla de oro**
> La pertenencia define quién existe.
> La responsabilidad define quién paga.

## 0.4 — SWAPS: DEFINICIÓN EXACTA
Un `SwapEvent` es:
Un overlay operativo, temporal, diario, reversible, auditable.

❌ **NO es**
*   Cambio del `weeklyPlan`
*   Cambio permanente de turno
*   Reasignación estructural

✔️ **Tipos permitidos (solo estos)**

### 1️⃣ COVER
*   A trabaja el turno de B.
*   B queda libre.
*   **A asume responsabilidad**
*   **B pierde responsabilidad**
*   Castigo → A si falta

### 2️⃣ DOUBLE
*   A trabaja su turno + otro más.
*   **A asume dos responsabilidades**
*   Castigo → A si falta cualquiera

### 3️⃣ EXCHANGE
*   A y B intercambian turnos ese día.
*   **Ambos asumen nuevo turno**
*   Castigo → quien debía trabajar ese día

❌ **NO EXISTE (en este sistema):**
*   Cambio permanente de turno
*   “Hoy solo noche sin cubrir a nadie”
*   → Feature aparte, fuera de alcance

## 0.5 — RESPONSABILIDAD PUNITIVA (REGLA DURA)
❗ **Esta regla no se negocia**

La incidencia SIEMPRE se asigna a quien:
`resolveEffectiveDuty().shouldWork === true`

Nada más importa.

**Ejemplos cerrados**

| Escenario | Castigado |
| :--- | :--- |
| A cubre a B y falta | **A** |
| B estaba cubierto y falta | **Nadie** |
| A doble turno y falta | **A** |
| A intercambia con B y falta | **Quien tenía ese turno ese día** |

## 0.6 — FUNCIÓN SOBERANA (EL CORAZÓN)
❗ **Función única del sistema**
`resolveEffectiveDuty(...)`

Esta función:
🔹 Es pura
🔹 No muta nada
🔹 No conoce UI
🔹 No conoce store
🔹 No depende del orden de llamadas

📌 Si algo pregunta “¿debía trabajar?” → esta función responde.

## 0.7 — REGLAS DE IMPLEMENTACIÓN (ANTI-INFIERNO)
🚫 **Prohibiciones absolutas**
❌ Calcular cobertura sin `resolveEffectiveDuty`
❌ Aplicar castigos usando plan base
❌ Decidir pertenencia usando swaps
❌ Lógica de negocio en el modal
❌ Estados globales nuevos

✅ **Obligaciones**
✔️ Tests antes de UI
✔️ Dominio primero
✔️ Un bug = una capa
✔️ Cada fase compila sola
