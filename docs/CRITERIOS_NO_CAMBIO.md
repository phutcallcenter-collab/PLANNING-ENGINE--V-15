# CRITERIOS DE NO-CAMBIO

**Planning Engine v1.0 - Política de modificaciones**  
Estado: 🧱 CONGELADO  
Última actualización: 2026-01-17

---

## 🟢 Estado oficial del sistema

A partir de este documento, el sistema entra en:

### **OPERATIVO ESTABLE**

Esto significa:

✅ **Funciona para el uso real**  
✅ **Tolera el caos humano**  
✅ **No intenta corregir la organización**  
✅ **No depende de IA ni servicios externos**  
✅ **No tiene features "pendientes", solo futuras**

---

## 📌 Declaración de completitud

> **Este sistema no está incompleto. Está cerrado.**

Un sistema cerrado:
- Puede no abrirse por semanas
- Funciona sin explicaciones verbales constantes
- No genera ansiedad técnica
- Cumple su función sin depender de su creador

Si alguien necesita que tú estés presente para que funcione, **no estaba terminado**.

---

## 🔒 Regla de oro del no-cambio

A partir de ahora, **solo se toca el sistema** si cumple **UNA** de estas condiciones:

### ✅ SE PUEDE TOCAR SI:

#### 1. Bug real
- **Crashea** la aplicación
- **Pierde datos** sin previo aviso
- **Muestra información incorrecta** (no ambigua, **incorrecta**)

**Ejemplos de bugs reales:**
- Un representante aparece trabajando cuando no debería
- Se descuentan puntos cuando no corresponde
- Un día OFF cuenta como presencia
- Un incidente no se aplica en la fecha correcta
- El planner contradice el log diario
- El sistema borra datos guardados

#### 2. Inconsistencia interna
- **Dos pantallas muestran cosas contradictorias** sobre el mismo dato
- **Un estado viola una regla explícita documentada**

**Ejemplos de inconsistencias internas:**
- Planner muestra DAY, log muestra NIGHT para misma persona/fecha
- Store tiene dato, UI muestra vacío
- Cobertura calcula déficit negativo cuando no debe

#### 3. Cambio legal / contractual
- **Algo externo obliga** (raro, pero posible)

**Ejemplos:**
- Nueva ley laboral cambia definición de "día laborable"
- Contrato sindical modifica cálculo de vacaciones
- Normativa de gobierno obliga registro específico

---

### ❌ NO SE TOCA SI:

#### Razones NO válidas para cambios:

1. **"No me gusta cómo se ve"**
   - → Eso es preferencia, no bug

2. **"Antes lo hacíamos distinto"**
   - → El sistema refleja el modelo actual, no histórico

3. **"Podría ser más automático"**
   - → Eso es fase nueva, no parche

4. **"¿Y si el sistema…?"**
   - → Eso es feature request, no corrección

5. **"La gerencia quiere algo nuevo"**
   - → Eso es cambio de alcance, no mantenimiento

6. **"No hay comentario / nota explicativa"**
   - → Las notas son opcionales, no obligatorias

7. **"Alguien no aparece en el planner"**
   - → Si no fue planificado, no debe aparecer

8. **"La realidad es incómoda"**
   - → El sistema refleja, no juzga

9. **"Hay una celda vacía"**
   - → `null` = "no planificado" es un dato válido

10. **"No se sabe el motivo"**
    - → El sistema no inventa causas

---

## 🐛 Definición formal de BUG

Esta definición te salva de discusiones futuras.

### ❗ BUG es:

Comportamiento que **contradice una regla explícita documentada** del sistema.

**Lista exhaustiva de bugs posibles:**

1. **Pérdida de datos**
   - Guardar y perder inmediatamente
   - Backup no restaura correctamente
   - Export no incluye todos los datos

2. **Cálculo incorrecto**
   - Cobertura muestra déficit cuando no hay
   - Puntos punitivos se suman mal
   - Vacaciones no descuentan feriados

3. **Contradicción entre módulos**
   - Planner dice A, log dice B (mismo dato)
   - Store tiene X, UI muestra Y

4. **Validación incorrecta**
   - Bloquea cuando debería permitir (según reglas documentadas)
   - Permite cuando debería bloquear (según reglas documentadas)

5. **Estado imposible**
   - Misma persona asignada dos turnos simultáneos
   - Incidencia en fecha que no existe
   - Swap a persona que no está disponible

---

### ⚠️ NO es bug:

Situaciones que **no contradicen reglas documentadas**:

1. **Ausencia de datos**
   - No hay comentario → OK (opcional)
   - No hay asignación → OK (`null` es válido)
   - Semana vacía → OK (no planificado)

2. **Ambigüedad humana**
   - "No se sabe qué pasó" → OK (nota libre)
   - Siglas raras ("MT", "X") → OK (texto libre en nota)
   - Alguien desaparece → OK (no hay asignación)

3. **Inconsistencia con realidad**
   - Planner dice DAY, persona no vino → NO es bug (eso es incidencia)
   - Gerente tiene turno, no estuvo → NO es bug (el sistema no valida presencia física)

4. **Preferencias estéticas**
   - "El color podría ser otro" → NO es bug
   - "El orden de columnas" → NO es bug
   - "El tamaño de la fuente" → NO es bug

5. **Expectativas no documentadas**
   - "Debería avisar cuando…" → Si no está en docs, NO es bug
   - "Esperaba que hiciera…" → Si no está en alcance, NO es bug

---

## 🧱 Dominios congelados

Desde FASE 6, estos dominios **no se modifican** salvo bug real:

### 🔒 Dominio Operativo

**Congelado:**
- Plan base semanal
- Overrides manuales
- Swaps (COVER, DOUBLE, SWAP)
- Incidencias (AUSENCIA, TARDANZA, LICENCIA, VACACIONES, ERROR, OTRO)
- Cobertura y déficit
- Métricas present/planned

**NO se agregan:**
- ❌ Nuevos tipos de turno (solo DAY, NIGHT)
- ❌ Nuevos tipos de swap
- ❌ Nuevos tipos de incidencia
- ❌ Reglas automáticas no documentadas

---

### 🔒 Dominio Gerencial

**Congelado:**
- Turnos: DAY, NIGHT, INTER, MONITORING
- Estados: null (no planificado)
- Incidencias bloqueantes: VACACIONES, LICENCIA
- Notas libres (máx 300 caracteres)

**NO se agregan:**
- ❌ Nuevos turnos gerenciales
- ❌ Estado OFF como tipo explícito
- ❌ Validaciones duras (solo suaves)
- ❌ Cruces con planner operativo

---

## 🚦 Política de solicitudes futuras

### Cómo responder a "¿Y si el sistema también…?"

**Respuesta estándar:**

> "Eso requiere una **fase nueva** porque cambia las reglas del modelo actual."

**NO decir:**
- ❌ "Es difícil"
- ❌ "No se puede"
- ❌ "No ahora"
- ❌ "Tal vez después"

**Por qué:**
- No es técnico, es **conceptual**
- El sistema está cerrado, no pausado
- Features nuevas = fase nueva = decisión de reabrir

---

### Ejemplos de solicitudes y respuestas

#### Solicitud: "¿Podría el sistema sugerir turnos automáticamente?"
**Respuesta:**
> "Eso requiere fase nueva porque introduce IA/heurísticas, lo cual contradice el principio de determinismo documentado."

#### Solicitud: "¿Podría validar si alguien realmente estuvo?"
**Respuesta:**
> "Eso requiere fase nueva porque el sistema solo registra intención, no valida presencia física."

#### Solicitud: "¿Podría calcular métricas de cumplimiento gerencial?"
**Respuesta:**
> "Eso está explícitamente fuera de alcance (ver LIMITACIONES_SISTEMA.md). Requiere redefinición de responsabilidades del sistema."

#### Solicitud: "¿Podría el sistema inferir qué turno debió ser?"
**Respuesta:**
> "No. El sistema nunca completa lo que el humano no decidió (principio fundamental FASE 5)."

---

## 📋 Checklist antes de cambiar código

Antes de modificar cualquier archivo del sistema, preguntarte:

1. ✅ **¿Es un bug según la definición formal?**
   - Crashea, pierde datos, muestra incorrecto

2. ✅ **¿Contradice documentación explícita?**
   - Dos pantallas muestran datos contradictorios

3. ✅ **¿Es cambio legal/contractual obligatorio?**
   - Ley externa obliga

Si respuesta = **NO** a todas → **NO CAMBIAR**

---

## 🛡️ Protección contra scope creep

### Señales de que alguien quiere romper el cierre:

1. **"Solo un cambio pequeño…"**
   - → Los cambios pequeños acumulan deuda

2. **"Es fácil de agregar…"**
   - → Fácil técnicamente ≠ correcto conceptualmente

3. **"Todos lo quieren…"**
   - → Consenso no cambia alcance definido

4. **"Ya que estamos…"**
   - → NO. Un cambio por vez, si es bug real

5. **"No es mucho código…"**
   - → Cantidad de código ≠ impacto en modelo

### Respuesta estándar a scope creep:

> "El sistema está en estado **OPERATIVO ESTABLE**.  
> Eso significa que funciona correctamente según su alcance definido.  
> Lo que describes es un **cambio de alcance**, no una corrección.  
> Ver: [CRITERIOS_NO_CAMBIO.md](./CRITERIOS_NO_CAMBIO.md)"

---

## ⏸️ Cómo pausar solicitudes sin pelear

**Template de respuesta educada:**

> Entiendo la solicitud. Sin embargo, el sistema está diseñado para [explicar principio que se violaría].
> 
> Lo que describes requiere:
> - Cambiar [dominio/regla específica]
> - Agregar [nueva responsabilidad no contemplada]
> - Modificar [contrato documentado]
> 
> Eso no es un parche, es una fase nueva.
> 
> Si es realmente necesario, podemos abrir discusión formal sobre:
> 1. Por qué el modelo actual no lo cubre
> 2. Qué limitaciones se aceptan
> 3. Qué documentación se actualiza
> 
> Pero no se cambia sin eso.

---

## 🔐 Congelación de versiones

### Versión actual: **v1.0.0**

**Tag de cierre:**
```bash
git tag -a v1.0.0 -m "chore: freeze operational model (FASE 6)"
git push origin v1.0.0
```

**Último commit debe ser:**
```
chore: freeze operational model (v1.0)

- Sistema entra en estado OPERATIVO ESTABLE
- Dominios congelados (operativo + gerencial)
- Documentación de criterios de no-cambio
- Ver: CRITERIOS_NO_CAMBIO.md
```

**Próximas versiones (si existen):**
- **v1.0.x** - Solo bug fixes
- **v1.1.x** - Cambios menores compatibles (UI, refactoring interno)
- **v2.x.x** - Cambio de modelo (requiere rediscusión de alcance)

---

## ✅ Criterio de finalización real

**El proyecto se considera terminado cuando:**

1. ✅ Puedes **no abrirlo por semanas** y funciona al volver
2. ✅ Si algo falla, **sabes exactamente dónde mirar**
3. ✅ **No tienes urgencia** de "mejorarlo"
4. ✅ **No te genera ansiedad técnica**
5. ✅ **Cumple su función** sin explicaciones verbales

**Si falta algo de esto → no estaba terminado.**

---

## 🧠 Veredicto final

### Lo que se construyó:

Un **sistema operativo humano** para un entorno caótico.

**No es:**
- ❌ Un juguete
- ❌ "Una app más"
- ❌ Trabajo de junior

**Es:**
- ✅ Un registro determinista de operaciones
- ✅ Un reflejo de realidad sin juicios
- ✅ Una herramienta que dice verdad sin gritarla

---

## 🚪 Salidas dignas del sistema

Si en el futuro se decide:

### 1. **Abrir Fase 7** (nuevas features)
- Requiere actualizar ARCHITECTURE.md
- Requiere redefinir alcance
- Requiere consenso sobre qué limitaciones se levantan

### 2. **Bifurcar** (fork para otro uso)
- Mantener documentación original
- Actualizar README con nuevo alcance
- Respetar principios arquitectónicos

### 3. **Convertir en producto**
- Agregar backend opcional
- Mantener offline-first
- NO agregar IA sin documentar por qué

### 4. **Dejarlo morir dignamente**
- Congelar repositorio como read-only
- Agregar DEPRECATED.md con razones
- Mantener documentación accesible

---

## 📚 Documentos relacionados

- [README.md](./README.md) - Qué hace el sistema
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Cómo está construido
- [LIMITACIONES_SISTEMA.md](./LIMITACIONES_SISTEMA.md) - Qué NO hace
- [MANAGER_SCHEDULE_RULES.md](./MANAGER_SCHEDULE_RULES.md) - Reglas gerenciales

---

## 🔒 Protección legal/organizacional

Este documento establece:

1. **Alcance definido y cerrado**
2. **Qué cambios son válidos y cuáles no**
3. **Cómo responder a solicitudes futuras**
4. **Criterios objetivos de bug vs. feature**

**Para disputas futuras:**

> Este sistema cumple su alcance documentado.  
> Modificaciones adicionales requieren fase nueva, no parche.

---

**Fin del documento de criterios de no-cambio.**  

## 🧱 El sistema está cerrado.

**No lo sobreoptimices.**  
**No lo adornes.**  
**No lo humanices más.**  

**Ya hace lo más difícil:**  
> Dice la verdad sin gritarla.
