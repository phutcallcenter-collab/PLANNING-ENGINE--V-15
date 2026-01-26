# 🛡️ CHECKLIST DE BLINDAJE — DAILY LOG / ONGOING EVENTS

> **ESTADO**: CONGELADO / FROZEN ZONE
> **FECHA**: 2026-01-24
> **REGLA**: Este documento es LEY. Cualquier cambio que viole estos principios se considera una regresión.

---

## 🧱 1. ARQUITECTURA (NO NEGOCIABLE)

- [ ] **Fuentes de Verdad**: `getOngoingIncidents` es la **ÚNICA** puerta para licencias, vacaciones, progreso y orden.
- [ ] **Prohibido Importar**: Ningún componente UI debe importar `resolveIncidentDates` ni `enrichOngoingIncident`.
- [ ] **Rol de la UI**: `DailyLogView` **NO** calcula tiempo, progreso ni estados temporales. Solo consume.
- [ ] **Dependencia de Calendario**: Si algo depende del calendario, vive en un **adapter**, nunca en la UI.

> 👉 Si alguien rompe esto, está rompiendo el sistema, no “refactorizando”.

---

## 🧠 2. FUENTE DE VERDAD TEMPORAL

- [ ] El “hoy” **SIEMPRE** es `contextDateStr` (la fecha navegada).
- [ ] **Cambiar día** en el calendario = **Cambia el contexto**.
- [ ] El progreso **NUNCA** depende de:
    - Filtros visuales (`TODAY` / `WEEK` / `MONTH`).
    - Scroll o posición.
    - Orden de creación.
- [ ] **Regla de Oro**: Un evento que no avanza con los días está roto.

---

## 📊 3. PROGRESO (SAGRADO)

- [ ] `progressRatio` solo se calcula **una vez** (en el helper/adapter).
- [ ] `dayCount`, `totalDuration`, `returnDate` **NO** son opcionales. Son obligatorios.
- [ ] **Sin retorno no hay paraíso**: Si no hay `returnDate` → **NO** es *ongoing*.
- [ ] **Integridad**: Si falta cualquier campo → el evento **NO** se renderiza.

> “Mostrar algo incompleto” = bug encubierto.

---

## 🔀 4. ORDEN (NO SE DISCUTE)

1.  **Primario**: `progressRatio` DESC (Más avanzado primero).
2.  **Secundario**: `returnDate` ASC (Termina antes primero).
3.  **Prohibido**: Ordenar por fecha de creación, nombre o ID.

---

## 🧾 5. EVENTOS PUNTUALES VS CONTINUOS

-   **Puntuales** (TARDANZA, AUSENCIA, ERROR, OTRO):
    -   Siempre 1 / 1.
    -   Siempre `progressRatio = 1`.
    -   **NUNCA** pasan por `getOngoingIncidents`.
-   **Continuos** (LICENCIA, VACACIONES):
    -   **NUNCA** aparecen en “Incidencias del Día” (`dayIncidents`).
    -   **SOLO** aparecen en “Eventos en Curso (Monitor)”.

> Mezclar esto es volver al caos.

---

## 🛡️ 6. DEFENSAS DE UI (OBLIGATORIAS)

- [ ] `DailyEventsList` **NO** intenta corregir datos.
- [ ] Si faltan campos numéricos/vitales → `return null`.
- [ ] UI no inventa defaults (ej. "asumir día 1").
- [ ] UI no “adivina” estados.

**La UI es una pantalla, no un cerebro.**

---

## 🧪 7. TEST MENTAL RÁPIDO (SI FALLA, ESTÁ MAL)

Antes de dar un PR por válido, responde:

-   [ ] ¿Si cambio el día, el progreso cambia?
-   [ ] ¿Si voy a un mes pasado, veo el estado correcto de ESE día?
-   [ ] ¿El orden se mantiene aunque recargue?
-   [ ] ¿Un evento terminado desaparece automáticamente?

Si una respuesta es “no”… hay fuga.

---

## 🧨 9. DECISIÓN FINAL (GRABADA EN PIEDRA)

> **EL TIEMPO SE DERIVA UNA SOLA VEZ.**
> **LA UI NO PIENSA.**
> **LOS ADAPTERS MANDAN.**

---

## 🔥 TESTS HOSTILES MANUALES (La Prueba Final)

Estos tests están diseñados para romper el sistema. Si alguno falla, el módulo NO está blindado.

### 🧨 NIVEL 1 — TIEMPO (El enemigo real)

#### 1. Viaje temporal agresivo
- [ ] Crea una licencia de 10 días.
- [ ] Muévete:
    - [ ] Al día 1 → Debe mostrar **1 / 10**.
    - [ ] Al día 5 → Debe mostrar **5 / 10**.
    - [ ] Al día 10 → Debe mostrar **10 / 10**.
    - [ ] Al día 11 → **NO** debe aparecer.
- ❌ **Fallo**: Si sigue visible o el progreso no cambia.

#### 2. Mes pasado / Mes futuro
- [ ] Abre Mes Actual.
- [ ] Navega a un mes anterior/posterior.
- ✅ **Esperado**: El progreso se recalcula según el contexto (no se congela).

### 🧨 NIVEL 2 — ORDEN (Psicología del caos)

#### 3. Orden contraintuitivo
- [ ] Crea Licencia A (día 8/10), B (día 3/5), C (día 1/2).
- [ ] **Orden esperado**: A (80%) → B (60%) → C (50%).
- ❌ **Fallo**: Si ordena por fecha de creación o nombre.

#### 4. Empate hostil
- [ ] Dos licencias con mismo progreso (ej. 60%).
- ✅ **Esperado**: La que termina antes va arriba.

### 🧨 NIVEL 3 — FILTROS

#### 5. Cambio violento
- [ ] Cambia rápido: Hoy → Semana → Mes → Hoy.
- ✅ **Esperado**: CERO duplicados, CERO días 0, CERO reinicios.

#### 6. Filtro ≠ Lógica
- [ ] Cambia de día SIN tocar el filtro.
- ✅ **Esperado**: El filtro solo afecta visibilidad, no el cálculo de progreso.

### 🧨 NIVEL 4 — DATOS MALICIOSOS

#### 7. Incidente corrupto
- [ ] Inyecta licencia sin `returnDate` o duración 0.
- ✅ **Esperado**: NO se renderiza, NO rompe la vista.

#### 8. Representante desactivado
- [ ] Desactiva un representante con licencia activa.
- ✅ **Esperado**: El evento desaparece limpiamente.

### 🧨 NIVEL 5 — INTERACCIÓN HUMANA

#### 9. Spam de navegación
- [ ] Click rápido: ← → ← → Hoy.
- ✅ **Esperado**: Sin parpadeos ni duplicados.

### 🧨 NIVEL 6 — REGRESIÓN

#### 11. “¿Dónde vive esta lógica?”
Para cada elemento visible:
- [ ] ¿Calculado por UI? ❌
- [ ] ¿Depende del filtro? ❌
- [ ] ¿Sale del adapter? ✅

---

> **VEREDICTO FINAL**: Si borras todo el estado del componente y solo cambias `logDate`, ¿el sistema sigue siendo coherente?
> Si la respuesta es **SÍ** → BLINDADO.
