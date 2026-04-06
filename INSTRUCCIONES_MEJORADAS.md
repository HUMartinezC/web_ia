# 📋 QuizAI — Instrucciones de Desarrollo

> Web educacional generadora de cuestionarios con IA, construida mediante *vibe coding* y desplegada en GitHub Pages.

---

## 🤖 Instrucciones para el Agente de IA

Este documento es tu **referencia principal y permanente** durante todo el desarrollo. Debes consultarlo antes de cada acción y actualizarlo después de cada tarea completada.

### Reglas de comportamiento

1. **Antes de escribir cualquier código**, revisa este documento para entender el contexto, las decisiones previas y el estado actual del proyecto.
2. **Después de completar cualquier tarea**, documenta lo realizado en el archivo correspondiente de `docs/` sin esperar a que se te pida.
3. **Nunca asumas** que algo ya está documentado. Compruébalo y, si no lo está, documéntalo tú.
4. **Si tomas una decisión técnica** no prevista en este documento (cambio de librería, estructura, modelo de HF, etc.), justifícala en `docs/architecture.md` y actualiza este documento si es relevante.
5. **Cada prompt que uses** para generar código, assets o contenido debe registrarse en `docs/prompts.md` con su herramienta, resultado y justificación.
6. **El estado del proyecto** debe reflejarse siempre en la sección `## 📊 Estado Actual` de este documento.

### Qué documentar y dónde

| Acción realizada | Dónde documentar |
|---|---|
| Nueva decisión de arquitectura o cambio técnico | `docs/architecture.md` |
| Prompt usado (código, diseño, assets, IA) | `docs/prompts.md` |
| Herramienta nueva utilizada | `docs/ai-tools.md` |
| Funcionalidad completada | `docs/README.md` + sección de estado de este doc |
| Problema encontrado y solución aplicada | `docs/reflections.md` |

---

## 📊 Estado Actual

> El agente debe mantener esta sección actualizada tras cada sesión de trabajo.

- [x] Scaffold del proyecto Angular creado
- [x] Estructura de carpetas implementada
- [x] Sidebar y layout base
- [x] Página `/generate` funcional
- [x] Integración Hugging Face Modelo 1 (generación)
- [ ] Página `/quiz/:id` funcional
- [ ] Persistencia en `localStorage`
- [ ] Integración Hugging Face Modelo 2 (clasificación)
- [ ] Página `/history` funcional
- [ ] Página `/stats` funcional
- [ ] Assets de IA integrados (imágenes/vídeo)
- [ ] Despliegue en GitHub Pages
- [ ] Documentación `docs/` completa

---

## 🎯 Visión del Proyecto

Crear una **aplicación web educacional** donde el usuario introduce un tema, selecciona un nivel de dificultad y recibe un cuestionario generado por un modelo de Hugging Face. La app registra el historial, muestra métricas de progreso y clasifica los tests por categoría mediante un segundo modelo de IA.

---

## ⚙️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Angular 21 (standalone components, signals) |
| Estado | Signals nativos de Angular + `localStorage` |
| Estilos | CSS custom properties + Angular animations |
| IA | Hugging Face Inference API (2 modelos) |
| Despliegue | GitHub Pages vía `angular-cli-ghpages` |
| Documentación | Markdown en `docs/` |

### Decisiones de arquitectura

- **Sin NgRx ni librerías de estado externas.** Usar `signal()`, `computed()` y `effect()` de Angular.
- **Standalone components** en todos los componentes (sin `NgModule`).
- **`inject()`** en lugar de inyección por constructor donde sea posible.
- **`HttpClient`** con el nuevo patrón funcional (`provideHttpClient`).

---

## 🗂️ Estructura de Carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── quiz.service.ts          # Lógica de cuestionarios
│   │   │   ├── huggingface.service.ts   # Llamadas a la API de HF
│   │   │   ├── history.service.ts       # Persistencia en localStorage
│   │   │   └── category.service.ts     # Clasificación por IA
│   │   └── models/
│   │       ├── quiz.model.ts
│   │       └── result.model.ts
│   ├── layout/
│   │   ├── sidebar/
│   │   └── header/
│   ├── pages/
│   │   ├── home/                        # Landing / bienvenida
│   │   ├── generate/                    # Creación de cuestionario
│   │   ├── quiz/                        # Visualización y respuesta
│   │   ├── history/                     # Tests guardados
│   │   └── stats/                       # Métricas y categorías
│   └── shared/
│       ├── components/                  # UI reutilizable
│       └── pipes/
├── assets/
│   └── (imágenes y vídeos generados con IA)
docs/
├── README.md
├── architecture.md
├── prompts.md
├── ai-tools.md
└── reflections.md
```

---

## 🔀 Flujo de la Aplicación

```
[Home] → [Generate] → introduce tema + nivel de dificultad
                    ↓
         [HF Model 1] genera cuestionario (5–10 preguntas)
                    ↓
              [Quiz] → usuario responde
                    ↓
         resultado guardado en localStorage
                    ↓
         [HF Model 2] clasifica el test por categoría
                    ↓
         [History] muestra tests pasados y permite repetirlos
         [Stats]   muestra métricas globales y categorías
```

---

## 🧩 Páginas y Funcionalidades

### 1. `/generate` — Crear cuestionario

- Input de texto libre: *"Escribe el tema"*
- Selector de dificultad: `Fácil | Normal | Difícil`
- Botón **Generar** → llama a Hugging Face Model 1
- Loading state animado mientras se genera
- Preview del cuestionario antes de empezar

### 2. `/quiz/:id` — Responder cuestionario

- Preguntas con opción múltiple (4 opciones)
- Navegación entre preguntas con barra de progreso
- Feedback inmediato al responder (correcto / incorrecto)
- Pantalla de resultados con puntuación y revisión de respuestas

### 3. `/history` — Tests guardados

- Lista de tests previos con: tema, categoría, fecha, puntuación
- Opción de **repetir** o **eliminar** cada test
- Filtros por categoría y dificultad

### 4. `/stats` — Métricas

- Tests realizados (total)
- Porcentaje global de acierto
- Gráfico simple de aciertos por categoría
- Racha actual y récord personal

### 5. Sidebar

- Navegación principal entre las 4 secciones
- Indicador de tests completados hoy
- Colapsable en móvil

---

## 🤖 Integración con Hugging Face

### Modelo 1 — Generación de cuestionario

- **Tarea:** `text-generation` o `text2text-generation`
- **Prompt de sistema sugerido:**

```
Generate a [difficulty] quiz about "[topic]" with 5 multiple-choice questions.
Each question must have 4 options and one correct answer.
Respond ONLY in valid JSON following this schema:
{ questions: [{ question, options: string[], correct: number }] }
```

- **Modelos candidatos:** `mistralai/Mistral-7B-Instruct-v0.3`, `google/flan-t5-large`

### Modelo 2 — Clasificación por categoría

- **Tarea:** `zero-shot-classification`
- Clasifica el tema del test en categorías: Ciencias, Historia, Tecnología, Arte, Geografía, etc.
- **Modelo candidato:** `facebook/bart-large-mnli`

> ⚠️ Ambos modelos se usan mediante la **Inference API gratuita** de Hugging Face. Gestionar errores de rate limit con reintentos y mensajes claros al usuario.

---

## 🎨 Identidad Visual

El estilo debe ser **"retro-escolar divertido"**: evoca cuadernos de clase, colores de tiza y pizarra, pero con un toque moderno y energético. No genérico, no corporativo.

> 💡 El diseño visual inicial puede generarse con herramientas de UI/UX como **Google Stitch**, **Figma AI**, **v0** u otras similares, exportando el resultado como base para los componentes Angular. Documentar el prompt y la herramienta usada en `docs/prompts.md` y `docs/ai-tools.md`.

### Guías de diseño

- De preferencia, utilizar como referencia las imagenes en `referencias/imgs/`
- **Paleta:** fondo oscuro tipo pizarra (`#1a1f2e`), acentos en amarillo tiza (`#f5e642`), coral (`#ff6b6b`) y verde menta (`#4ecdc4`)
- **Tipografía:** fuente display tipo handwritten/chalk para títulos + monospace legible para preguntas
- **Iconografía:** emojis educativos y SVGs simples (📚 🧠 ✏️ ⭐)
- **Animaciones:** transiciones suaves entre páginas, confetti al completar un quiz, shake en respuesta incorrecta
- **Assets IA:** incluir al menos 1 imagen generada con IA como hero/background y 1 vídeo corto de intro o mascota

---

## 🚀 Despliegue en GitHub Pages

```bash
# Instalar herramienta de despliegue
npm install -g angular-cli-ghpages

# Build de producción con base-href correcto
ng build --base-href /nombre-del-repo/

# Desplegar
npx angular-cli-ghpages --dir=dist/nombre-del-proyecto/browser
```

Configurar en `angular.json` el `outputPath` y el `baseHref` del repositorio antes de hacer el build.

---

## 📄 Documentación (`docs/`)

Cada archivo debe completarse **durante** el desarrollo, no al final.

| Archivo | Contenido |
|---|---|
| `README.md` | Descripción, capturas, enlace a la web, instrucciones de ejecución local |
| `architecture.md` | Decisiones técnicas, diagrama de componentes, estructura de datos |
| `prompts.md` | **Todos** los prompts usados en el desarrollo, con herramienta, resultado y justificación |
| `ai-tools.md` | Herramientas utilizadas (generación de código, imágenes, vídeo, diseño) con valoración |
| `reflections.md` | Qué funcionó, qué no, qué aprendió cada integrante |

---

## ✅ Checklist de Entregables

- [ ] Enlace a la web funcional en GitHub Pages
- [ ] Repositorio público con historial de commits descriptivos
- [ ] Carpeta `docs/` completa
- [ ] Al menos 2 modelos de Hugging Face integrados
- [ ] Imágenes y/o vídeos generados con IA coherentes con el diseño
- [ ] Presentación en clase: demo en vivo + explicación del proceso de *vibe coding*

---

## 💡 Recomendaciones de Proceso

1. **Empezar por el diseño:** usar una herramienta de generación de UI para obtener una base visual antes de codificar.
2. **Iterar los prompts de HF:** probar el prompt de generación con varios modelos y ajustar el JSON schema hasta que sea consistente.
3. **Versionar los prompts:** cada prompt relevante va a `docs/prompts.md` inmediatamente.
4. **Mobile-first:** el sidebar debe funcionar bien en pantallas pequeñas desde el principio.
5. **Manejar errores de API:** siempre mostrar estados de carga, error y vacío en la UI.
6. **Commits pequeños y frecuentes:** facilita identificar qué generó cada IA y qué ajustes manuales se hicieron.