# Documento de Visión de Diseño — Planning Engine v2.0

Este documento captura las ideas y la dirección visual para la evolución de la interfaz de la aplicación. Sirve como referencia y "estrella polar" para futuras implementaciones de UI, asegurando que el desarrollo sea coherente con una visión de producto final pulida y profesional.

---

## 1. Principios Fundamentales del Diseño

La visión final de la aplicación se aleja de una simple herramienta funcional para convertirse en una plataforma de gestión integral, intuitiva y estéticamente agradable. Los principios clave son:

-   **Claridad y Contraste**: Uso de una paleta de colores limpia con alto contraste para facilitar la legibilidad.
-   **Información Visual Rápida**: Priorizar iconos y códigos de color sobre texto denso para que el estado del sistema se pueda escanear de un vistazo.
-   **Consistencia de Componentes**: Todos los elementos (botones, modales, formularios) deben seguir una línea de diseño unificada.
-   **Responsabilidad Única por Vista**: Cada pantalla tiene un propósito principal y no compite con otras por la atención del usuario.

---

## 2. Estructura y Layout General

La aplicación se consolida sobre una **navegación por pestañas (Tabs)** que garantiza que solo una vista principal esté activa en todo momento.

-   **Navegación por Pestañas (Tabs)**: La funcionalidad se divide en secciones claras y accesibles en la parte superior. Cada pestaña renderiza su propia vista de forma exclusiva, eliminando conflictos de layout. Las secciones previstas son:
    -   `Planificación Semanal`: Su único propósito es visualizar y ajustar el plan de trabajo futuro. Permite `overrides` (WORKING/OFF) y gestiona reglas de cobertura.
    -   `Registro Diario`: Su único propósito es registrar eventos (incidencias) que ya ocurrieron. Muestra un formulario y una lista de eventos para el día seleccionado.
    -   `Vista Mensual`
    -   `Estadísticas y Reportes`
    -   `Gestión de Personal`

-   **Layout Contextual**: Dentro de cada vista, se puede usar un layout de múltiples paneles si es necesario (ej. `Planificación`), pero nunca dos vistas principales compitiendo entre sí.

---

## 3. Paleta de Colores y Estética

Se adoptará un tema claro y profesional.

-   **Fondo**: Un fondo blanco o gris muy claro (#FFFFFF, #F8F9FA) para maximizar el contraste y la sensación de espacio.
-   **Color Primario (Acción)**: Un **azul/índigo** fuerte será el color principal para botones de acción (`Confirmar`, `Guardar`), elementos seleccionados y links interactivos.
-   **Colores Semánticos (Basado en `incidentStyles.ts`)**:
    -   **Verde (`VACACIONES`, `WORKING`)**: Para indicar estados positivos o planificados.
    -   **Rojo (`AUSENCIA`, `ERROR`)**: Para señalar problemas, déficits o eventos no planificados.
    -   **Azul (`LICENCIA`)**: Para estados de ausencia planificada formal.
    -   **Amarillo/Naranja (`TARDANZA`)**: Para advertencias o eventos de menor severidad.
    -   **Gris (`OFF` base)**: Para estados neutros o de ausencia base.

---

## 4. Visión por Componente

-   **Tabla de Planificación (`PlanView`)**:
    -   Utiliza fondos de color semántico para comunicar el estado de cada celda (`WORKING`, `OFF`, `AUSENCIA`, etc.).
    -   Muestra iconos sutiles (🏖️, 📄) para `VACACIONES` y `LICENCIA`.
    -   Las celdas afectadas por `VACACIONES` o `LICENCIA` están **bloqueadas**, ignorando los clics para `override`.
    -   Las celdas con `AUSENCIA` tienen un estilo distintivo (rojo) y están igualmente bloqueadas.

-   **Formulario de Registro (`DailyLogView`)**:
    -   Es la **única** vía para crear cualquier tipo de incidencia.
    -   Implementa validación en tiempo real, deshabilitando el botón de registro y mostrando mensajes de error claros y contextuales.

-   **Gráficos (`CoverageChart`)**:
    -   Diseño minimalista, utilizando el color para comunicar `déficit` (rojo) o `superávit` (verde/azul).

-   **Modales**:
    -   Limpios, centrados y con una superposición oscura para enfocar la atención del usuario.

---

## 5. Alineación con la Arquitectura Actual

La arquitectura de software existente (separación de dominio, estado y UI) está **perfectamente alineada** con esta visión de diseño. El hook `useAppState` actúa como el orquestador central que provee el estado necesario a la vista activa, garantizando la coherencia de los datos.

---

## 🌐 Interfaz Final: **Planificador Integral de Turnos y Cobertura**

### 1. **Encabezado General**
- **Nombre del módulo**: *Control de Turnos y Cobertura v2.0*
- **Menú de Ajustes**: Acceso a acciones globales como `Resetear Planificación`.

---

### 2. **Navegación Principal**
- Pestañas claras y definidas: `Planificación`, `Registro Diario`, `Vista Mensual`, `Estadísticas`.

---

### 3. **Vista de Planificación**
- **Panel Izquierdo**: Grilla de planificación semanal (`PlanView`) con `overrides`.
- **Panel Derecho**: Gráfico de cobertura y panel de reglas de cobertura.

---

### 4. **Vista de Registro Diario**
- **Panel Izquierdo**: Lista de representantes para seleccionar el contexto.
- **Panel Derecho**: Formulario de registro de incidencias y lista de eventos del día.

---
