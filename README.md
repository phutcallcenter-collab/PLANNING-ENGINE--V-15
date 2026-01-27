npm# Planning Engine — v1.0 (OPERATIVO ESTABLE)

**Estado**: 🟢 OPERATIVO ESTABLE | **Stack**: Next.js 14 + TypeScript + Zustand + IndexedDB  
**Última actualización**: 2026-01-18 | **Fase**: 7 (CONTRATO VISUAL CERRADO)

---

## 📖 Qué hace este sistema

**Planning Engine** es un sistema de gestión operativa para equipos de trabajo con dos módulos independientes:

1. **Planner Operativo**: Planificación de turnos de representantes (DAY/NIGHT), registro de incidencias, cobertura, swaps
2. **Planner Gerencial**: Asignación de turnos gerenciales (Día/Noche/Inter/Monitoreo)

**No es:**
- ❌ Un optimizador automático
- ❌ Un sistema de IA que "aprende"
- ❌ Una herramienta de auditoría laboral
- ❌ Un reemplazo de decisiones humanas

**Es:**
- ✅ Un registro determinista de planificación e incidencias
- ✅ Un reflejo de la realidad operativa sin juicios
- ✅ Una herramienta que muestra verdad sin corregirla
- ✅ Un sistema que tolera ambigüedad humana

**Principio fundamental:**
> El sistema nunca completa lo que el humano no decidió.

**Para quién:**
- Organizaciones con operación 24/7
- Equipos que necesitan registrar turnos y eventos reales
- Gerencias que necesitan visibilidad sin burocracia
- Humanos que aceptan que la realidad es caótica

---

## 🎯 Qué problemas resuelve

1. **Registro de turnos sin ambigüedad** - DAY/NIGHT para operativos, Día/Noche/Inter/Monitoreo para gerencia
2. **Incidencias del mundo real** - Ausencias, tardanzas, vacaciones, licencias sin interpretación
3. **Cobertura en tiempo real** - Déficit/superávit sin heurísticas opacas
4. **Swaps validados** - COVER, DOUBLE, SWAP con reglas explícitas
5. **Auditoría completa** - Todo cambio deja rastro

**Qué NO resuelve (deliberadamente):**
- ❌ Optimización automática de horarios
- ❌ Detección de patrones "sospechosos"
- ❌ Métricas de cumplimiento gerencial
- ❌ Inferencia de datos faltantes
- ❌ Corrección de inconsistencias humanas

Ver: [LIMITACIONES_SISTEMA.md](./LIMI (Incidencias)**
Registra el **"ser"**: ¿Qué **ocurrió** realmente?

- Registro de **incidencias** del mundo real:
  - `AUSENCIA`: Falta no justificada (bloquea el día)
  - `TARDANZA`: Llegada tarde
  - `LICENCIA`: Ausencia justificada médica/administrativa (14 días)
  - `VACACIONES`: Periodo de descanso (cuenta solo días laborales, excluye feriados)
  - `ERROR`: Errores operativos
  - `OTRO`: Eventos misceláneos
- Sistema de **puntos punitivos** por tipo de incidencia
- **Jerarquía de prioridad**: `AUSENCIA` > `LICENCIA`/`VACACIONES` > otros eventos
- Validación de incidencias duplicadas
- Vista de incidencias activas del día

### 3. 👔 **Módulo de Planificación Gerencial**
Asignación de turnos para supervisores/gerentes:

- **Turnos gerenciales**: DAY (Día), NIGHT (Noche), INTER (Intermedio), MONITORING (Monitoreo)
- **Notas libres** por asignación (máx 300 caracteres)
- **Validación suave**: Advertencias visuales, no bloqueos
- **Bloqueo por vacaciones/licencias**: No se puede editar si hay incidencia bloqueante
- **Separación total**: No afecta cobertura del planner operativo
- **Principio clave**: `null` ≠ `OFF` → null = "no planificado" (dato válido)

Ver: [MANAGER_SCHEDULE_RULES.md](./MANAGER_SCHEDULE_RULES.md) SWAP) con validación de conflictos
- Gestión de **reglas de cobertura** por turno/fecha con jerarquía
- Soporte para **horarios especiales** temporales
- Cálculo de déficit de cobertura en tiempo real
- Respeta feriados y días festivos configurados

### 2. 📝 **Módulo de Registro Diario**
Registra el **"ser"**: ¿Qué **ocurrió** realmente?

- Registro de **incidencias** del mundo real:
  - `AUSENCIA`: Falta no justificada (bloquea el día)
  - `TARDANZA`: Llegada tarde
  - `LICENCIA`: Ausencia justificada médica/administrativa (14 días)
  - `VACACIONES`: Periodo de descanso (cuenta solo días laborales, excluye feriados)
  - `ERROR`: Errores operativos
  - `OTRO`: Eventos misceláneos
- Sistema de **puntos punitivos** por tipo de incidencia
- **Jerarquía de prioridad**: `AUSENCIA` > `LICENCIA`/`VACACIONES` > otros eventos
- Validación de incidencias duplicadas
- Vista de incidencias activas del día

---

## 🏗️ Arquitectura del Sistema

### Principios Arquitectónicos

1. **Separación Estricta de Capas**:
   ```
   Domain (lógica de negocio)
      ↓
   Store (Zustand - estado global)
      ↓
   Hooks (useWeeklyPlan, useCoverage)
      ↓
   UI (React - presentación)
   ```

2. **Single Source of Truth**:
   - `weeklyPlan`: Plan base semanal
   - `incidents`: Eventos reales registrados
   - `swaps`: Operaciones de cambio de turno
   - `representatives`: Catálogo de personal

3. **Flujo de Datos Unidireccional**:
   - El dominio **nunca** importa de UI
   - La UI **nunca** contiene lógica de negocio
   - El estado **nunca** decide, solo almacena

### Estructura de Directorios

```
src/
├── domain/              # 🧠 Lógica de negocio (NÚCLEO)
│   ├── planning/        # Motor de planificación
│   │   ├── buildWeeklySchedule.ts    # Constructor del plan
│   │   ├── resolveCoverage.ts         # Resolución de cobertura
│   │   ├── computeDailyCoverage.ts    # Cálculo diario
│   │   └── shiftAssignment.ts         # Asignación de turnos
│   ├── swaps/           # Sistema de intercambios
│   │   ├── validateSwapOperation.ts   # Validación de swaps
│   │   ├── resolveEffectiveDuty.ts    # Resolución efectiva
│   │   └── SWAP_RULES.md              # Especificación de reglas
│   ├── incidents/       # Sistema de incidencias
│   ├── representatives/ # Modelo de representantes
│   ├── calendar/        # Sistema de calendario y días especiales
│   ├── availability/    # Lógica de disponibilidad
│   └── audit/           # Sistema de auditoría
│
├── store/               # 💾 Estado global (Zustand)
│   └── useAppStore.ts   # Store principal con persistencia
│
├── hooks/               # 🎣 Hooks de React
│   ├── useWeeklyPlan.ts     # Hook del plan semanal
│   ├── useCoverage.ts       # Hook de cobertura
│   └── useEditMode.tsx      # Modo de edición admin
│
├── ui/                  # 🎨 Componentes de interfaz
│   ├── planning/        # Vista de planificación
│   ├── daily-log/       # Vista de registro diario
│   ├── stats/           # Vista de estadísticas
│   └── config/          # Vista de configuración
│
├── application/         # 🔧 Adaptadores y presentadores
│   ├── ui-adapters/     # Transformadores dominio → UI
│   └── presenters/      # Lógica de presentación
│
└── persistence/         # 💿 Capa de persistencia (IndexedDB)
```

---

## 🚨 Áreas de Alto Riesgo (NO TOCAR)

Si tocas esto sin entender el "por qué", el sistema dejará de ser determinista y pasará a ser "una opinión".

1. **Tokens Visuales (`tokens.css`)**:
   - Fuente única de verdad. No usar HEX ni estilos inline.
   - Romper esto elimina la consistencia visual y el soporte futuro de temas (Dark Mode).

2. **Lógica de Swaps (`validateSwapOperation.ts`)**:
   - Contiene 29 invariantes de seguridad.
   - Modificar una condición aquí puede permitir estados imposibles (doble turno, cobertura fantasma).

3. **Resolución de Fechas (`resolveIncidentDates.ts`)**:
   - Diferencia crítica entre días naturales (Licencias) y días hábiles (Vacaciones).
   - Tocar esto rompe el cálculo de nómina y días libres.

4. **Identidad de Turno (`belongsToShiftThisWeek`)**:
   - Determina quién aparece en qué turno.
   - Alterar esto causa "agentes fantasma" o desapariciones en la grilla.

---

## 🔑 Conceptos Fundamentales

### 1. **Representative (Representante)**
Persona del equipo con:
- `baseShift`: Turno base (`DAY` o `NIGHT`)
- `baseSchedule`: Días de trabajo/descanso semanal
- `mixProfile` (opcional): Perfil mixto (trabaja ambos turnos)

### 2. **ShiftAssignment (Asignación de Turno)**
Estado efectivo de trabajo:
- `NONE`: No trabaja
- `SINGLE { shift }`: Trabaja un turno específico
- `BOTH`: Trabaja ambos turnos (mixto)

### 3. **WeeklyPlan (Plan Semanal)**
Estructura central que contiene el plan de toda la semana:
```typescript
{
  weekStart: ISODate,
  agents: WeeklyPresence[]  // Un registro por representante
}
```

### 4. **DailyPresence (Presencia Diaria)**
Estado de un representante en un día específico:
```typescript
{
  status: 'WORKING' | 'OFF',
  source: 'BASE' | 'OVERRIDE' | 'INCIDENT',
  type?: IncidentType,
  assignment?: ShiftAssignment
}
```

### 5. **SwapEvent (Evento de Intercambio)**
Operación atómica de cambio de turno:
- **COVER**: A cubre el turno de B (B queda libre)
- **DOUBLE**: A trabaja turno adicional
- **SWAP**: A y B intercambian turnos

### 6. **CoverageRule (Regla de Cobertura)**
Define requisitos mínimos de personal:
```typescript
{
  scope: 'GLOBAL' | 'SHIFT' | 'DATE',
  required: number
}
```

Jerarquía: `DATE` > `SHIFT` > `GLOBAL`

---

## 🚀 Características Principales

### ✅ Sistema de Planificación

- **Plan Semanal Visual**: Grilla interactiva con estados semánticos
- **Navegación Temporal**: Semana actual, anterior, siguiente
- **Drag & Drop**: Asignación de representantes a turnos (próximamente)
- **Overrides Manuales**: Cambio WORKING ↔ OFF con modo admin
- **Sistema de Swaps Blindado**:
  - Validación de conflictos en tiempo real
  - Prevención de doble asignación
  - Mensajes de error descriptivos en español
  - 29 tests de escenarios hostiles
- **Horarios Especiales**: Wizard guiado para asignaciones temporales
- **Indicadores de Cobertura**: Visualización de déficit por turno

### ✅ Sistema de Registro

- **Formulario de Incidencias**: Registro estructurado de eventos
- **Vista del Día**: Lista de incidencias activas
- **Validación de Duplicados**: Prevención de registros conflictivos
- **Cálculo de Vacaciones Inteligente**:
  - Cuenta solo días laborales (excluye feriados + días OFF base)
  - Duración fija: 14 días laborales efectivos
- **Gestión de Licencias**: Cuenta días calendario consecutivos

### ✅ Analytics y Reportes

- **Resumen Mensual**: KPIs ejecutivos + gráficas
- **Reporte de Puntos**: Tabla administrativa por rol/turno
- **Reporte Ejecutivo**: Herramienta de decisión (riesgo → reconocimiento)
- **Personas en Riesgo**: Detección automática de umbrales

### ✅ Configuración

- **Gestión de Representantes**: CRUD completo con drag & drop
- **Calendario de Feriados**: Configuración de días festivos
- **Reglas de Cobertura**: Editor de requisitos mínimos
- **Auditoría del Sistema**: Log de cambios (próximamente)

---

## 🧪 Testing

El sistema tiene **cobertura exhaustiva** en tres niveles:

### 1. **Unit Tests**
- Validación de reglas individuales
- Lógica de dominio aislada
- Helpers y utilidades

### 2. **Integration Tests**  
- Motor de planificación con reglas reales
- Sistema de swaps con contexto
- Resolución de cobertura

### 3. **System Tests**
- Escenarios completos end-to-end
- **29 tests de "pruebas hostiles"** para swaps
- Validación de flujos críticos

**Comando**: `npm test`

---

## 📱 Progressive Web App (PWA)

### Características Offline

- ✅ **Instalable**: Desktop + móvil
- ✅ **Shell siempre disponible**: Abre sin conexión
- ✅ **Datos offline**: Lectura completa sin internet
- ✅ **Banner honesto**: "Modo consulta" cuando offline
- ✅ **Service Worker**: Cache inteligente (Shell Cache First, Views SWR)
- ✅ **Updates silenciosos**: Sin prompts molestos

### Performance

- Primera carga < 2s
- Navegación instantánea entre vistas
- Persistencia automática en IndexedDB (300ms debounce)

- **Persistencia automática en IndexedDB (300ms debounce)**
- **Design System Tokenizado**: Contrato visual estricto (Zero hardcoded values)

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Lenguaje** | TypeScript 5 |
| **Estado** | Zustand 4.5 + Immer |
| **Persistencia** | IndexedDB (idb) |
| **UI** | React 18 + Framer Motion |
| **Fechas** | date-fns 3.6 |
| **Charts** | Chart.js + react-chartjs-2 |
| **Testing** | Jest + ts-jest |
| **DnD** | @dnd-kit |

---

## 📦 Instalación y Uso

### Requisitos

- Node.js 20+
- npm o yarn

### Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Tests
npm test

# Linter
npm run lint
```

### Acceso

- **Desarrollo**: http://localhost:3000
- **Producción**: Compilar y deployar en Vercel/Netlify

---

## 📚 Documentación Adicional

El proyecto incluye **documentación exhaustiva**:

- `blueprint.md`: Contrato arquitectónico definitivo
- `system_contract.md`: Contrato integral del sistema (Fase 0)
- `SWAP_RULES.md`: Especificación completa de reglas de swaps
- `SWAP_INVARIANTS.ts`: Invariantes del sistema de swaps
- `HOLIDAYS_AND_VACATIONS.md`: Sistema de feriados y vacaciones
- `PRUEBAS_HOSTILES.md`: Escenarios de validación de swaps
- `BLINDAJE_SWAPS.md`: Resumen de implementación del sistema de swaps
- `RELEASE_NOTES.md`: Notas de la versión 1.0.0
- `design-vision.md`: Documento de visión de diseño UI

---

## 🔒 Reglas de Negocio Críticas

### Jerarquía de Incidencias

```
AUSENCIA (prioridad máxima)
   ↓
LICENCIA / VACACIONES (bloquean día)
   ↓
TARDANZA / ERROR / OTRO (eventos normales)
   ↓
OVERRIDE (modificación de plan)
```

### Validación de Swaps

**COVER es válido cuando**:
- Turnos base diferentes: SIEMPRE ✅
- Mismo turno base: SOLO si el que cubre está OFF ✅
- Perfil MIXTO: SOLO si está OFF ✅

**PROHIBIDO**:
- Cubrir a alguien de vacaciones/licencia ❌
- Cubrir con alguien de vacaciones/licencia ❌
- Doblar turno cuando ya trabaja ❌

### Resolución de Cobertura

1. Verifica regla por **DATE** específica
2. Verifica regla por **SHIFT** (DAY/NIGHT)
3. Verifica regla **GLOBAL**
4. Fallback: `required = 0`

---

## 🧭 Filosofía del Proyecto

> "No buscamos la asignación perfecta, sino un sistema que siempre sepa **por qué eligió lo que eligió** y **qué ocurrió realmente**."

### Principios de Diseño

1. **Autoridad Silenciosa**: No pide atención, la merece cuando algo falla
2. **Un Color = Una Verdad**: Verde WORKING, Rojo ABSENT, Gris OFF
3. **Honestidad Offline**: El sistema no miente sobre sus capacidades
4. **Jerarquía Visual Narrativa**: Contexto → Acción → Resultado

---

## 🚧 Estado del Proyecto

**Versión: v2.0 – Operational Core**

### ✅ Completado
- ✔️ Núcleo de planificación y registro funcional y estable
- ✔️ Sistema de swaps completamente blindado (29 tests)
- ✔️ Separación estricta planificación (`overrides`) vs eventos reales (`incidents`)
- ✔️ PWA completa con soporte offline
- ✔️ Persistencia automática en IndexedDB
- ✔️ Sistema de auditoría integrado
- ✔️ Analytics y reportes ejecutivos
- ✔️ Sistema de feriados y vacaciones inteligente
- ✔️ **Sin deuda técnica conocida**

### 🔮 Roadmap Futuro

- SoftRules avanzadas (fatiga, rotación, preferencias históricas)
- Sistema de explicación ("por qué se asignó X")
- Simulación y evaluación de escenarios
- Módulo de analíticas avanzadas (cuando el modelo de turnos esté estable)
- Export de reportes (PDF/Excel)
- Sistema de notificaciones push

---

## 📄 Licencia

Privado - © 2026 Juno002

---

## 🤝 Contribución

Este es un proyecto privado. Para consultas, contactar al propietario del repositorio.

---

**Última actualización**: 2026-01-13