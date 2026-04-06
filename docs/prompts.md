# Registro de Prompts

## 2026-04-06

- Herramienta: Copilot Chat
- Prompt: Generar el scaffold completo del proyecto desde `INSTRUCCIONES_MEJORADAS.md` y esperar confirmación entre fases.
- Resultado: Se definió un plan por fases y se creó el scaffold inicial de Angular.
- Justificación: Era necesario avanzar con control para no mezclar scaffold, layout y funcionalidades.

## 2026-04-06 - Fase 2

- Herramienta: Copilot Chat
- Prompt: Continuar con el punto 2 e implementar la estructura de carpetas.
- Resultado: Se creó la subestructura `src/app/` para core, layout, páginas y shared.
- Justificación: La estructura debía existir antes de añadir layout y funcionalidades.

## 2026-04-06 - Fase 3

- Herramienta: Copilot Chat
- Prompt: Continuar con el punto 3 y construir sidebar + layout base.
- Resultado: Se añadió el shell persistente con sidebar y rutas placeholder.
- Justificación: La navegación principal debía estar lista antes de desarrollar páginas.

## 2026-04-06 - Fase 4

- Herramienta: Copilot Chat
- Prompt: Continuar con el punto 4 y hacer funcional la página Generate sin Hugging Face todavía.
- Resultado: Se añadieron input de tema, selector de dificultad, estado de carga, validación y preview local.
- Justificación: Primero debía existir un flujo usable antes de integrar IA remota.

## 2026-04-06 - Fase 5

- Herramienta: Copilot Chat
- Prompt: Continuar con el punto 5 e integrar Hugging Face Modelo 1 para generar quizzes.
- Resultado: Se integró servicio reusable de HF, configuración por entorno, parser y fallback local.
- Justificación: Se necesitaba un camino remoto real con respaldo en caso de fallo.

## 2026-04-06 - Rollback de HF

- Herramienta: Copilot Chat
- Prompt: Deshacer el cambio de configuración runtime y restaurar el setup original por environment.
- Resultado: Se eliminó el setup runtime por UI/localStorage y se restauró el flujo por environment.
- Justificación: El problema reportado era configuración de token, no la base de implementación.

## 2026-04-06 - Corrección dev + cambio de modelo

- Herramienta: Copilot Chat
- Prompt: Corregir ausencia de requests y cambiar a `meta-llama/Llama-3.1-8B-Instruct` por indisponibilidad del modelo previo.
- Resultado: Se habilitaron requests en desarrollo y se alineó la configuración de modelos en dev/prod.
- Justificación: `ng serve` usa `environment.ts`; con `enabled=false` y token vacío no salían peticiones.

## 2026-04-06 - Compatibilidad con HF Router

- Herramienta: Copilot Chat
- Prompt: Usar el patrón oficial OpenAI-compatible de HF Router y modelo `meta-llama/Llama-3.1-8B-Instruct:novita`.
- Resultado: Migración a `https://router.huggingface.co/v1/chat/completions`, ajuste de model id y eliminación de fallback silencioso.
- Justificación: El endpoint anterior no era fiable para ese modelo y dificultaba depuración.

## 2026-04-06 - Normalización de respuesta HF

- Herramienta: Copilot Chat
- Prompt: Corregir generación cuando solo aparece la primera pregunta y el resto falla sin respuestas.
- Resultado: Parser robusto para formatos mixtos de opciones/preguntas y garantía de 4 opciones + índice válido.
- Justificación: El modelo devolvía estructuras heterogéneas que rompían el render Angular.

## 2026-04-06 - Reaplicación tras conflicto git

- Herramienta: Copilot Chat
- Prompt: Reaplicar el fix de parsing tras conflicto que lo revirtió.
- Resultado: Se restauró la normalización robusta y se evitó la regresión.
- Justificación: El conflicto había reintroducido el fallo de UI.

## 2026-04-06 - Número variable de preguntas + submit interactivo

- Herramienta: Copilot Chat
- Prompt: Soportar prompts como "Crea un cuestionario de 20 preguntas de programación" y permitir responder/enviar test.
- Resultado: Detección automática de cantidad de preguntas + selección de respuestas + envío + score.
- Justificación: El quiz debía ser accionable y respetar la cantidad solicitada por el usuario.

## 2026-04-06 - Persistencia en Generate

- Herramienta: Copilot Chat
- Prompt: Mantener estado del test en Generate al cambiar de ruta y volver.
- Resultado: Persistencia temporal en `localStorage` (quiz, respuestas, enviado, score, tema y mensajes).
- Justificación: El flujo requería continuidad sin perder progreso.

## 2026-04-06 - Generate solo preview + ruta dedicada de quiz

- Herramienta: Copilot Chat
- Prompt: Mostrar solo preview en Generate y mover resolución a `/quiz/:id` con flujo por pregunta.
- Resultado: Refactor de Generate, creación de ruta interactiva y persistencia de sesión por id.
- Justificación: Separar generación y resolución redujo complejidad y mejoró continuidad.

## 2026-04-06 - Implementación de History

- Herramienta: Copilot Chat
- Prompt: Implementar historial para quizzes parciales/completados con repetir y eliminar.
- Resultado: Página `/history` funcional con filtros y acciones de continuar, repetir y eliminar.
- Justificación: Era necesario gestionar quizzes más allá de una sola ejecución.

## 2026-04-06 - Implementación de Stats

- Herramienta: Copilot Chat
- Prompt: Implementar una página de métricas funcional.
- Resultado: Dashboard `/stats` con totales, precisión global, rachas y barras por categoría.
- Justificación: Se requería medir progreso de aprendizaje de forma visible.

## 2026-04-06 - Modelo 2 para nombre/categoría

- Herramienta: Copilot Chat
- Prompt: Usar un segundo modelo para nombrar mejor cada test.
- Resultado: Segunda llamada HF para metadatos (`title`, `category`) con fallback robusto.
- Justificación: Separar generación de contenido y etiquetado mejora consistencia.

## 2026-04-06 - Imagen por quiz + historial tipo galería

- Herramienta: Copilot Chat
- Prompt: Integrar `stabilityai/stable-diffusion-xl-base-1.0` y guardar imagen en base64 por quiz.
- Resultado: Generación de imagen, conversión blob/base64, persistencia y tarjetas visuales en History.
- Justificación: Se buscaba identidad visual por quiz y experiencia de galería.

## 2026-04-06 - Fix de placeholders de imagen

- Herramienta: Copilot Chat
- Prompt: Corregir History cuando solo muestra placeholders pese a integrar generación de imagen.
- Resultado: Parser robusto de respuestas binarias/JSON, lógica de reintento y espera por carga de modelo.
- Justificación: Los endpoints de imagen de HF pueden devolver payloads de estado antes de la imagen final.

## 2026-04-06 - UI en español + refresh de sidebar/history/stats

- Herramienta: Copilot Chat
- Prompt: Reemplazar Home genérico, traducir UI, añadir borrar todo en History y rediseñar Stats.
- Resultado: Home con CTAs, traducción visible al español, borrado masivo en History, contador diario en sidebar y rediseño de Stats.
- Justificación: Se necesitaba una experiencia coherente, en español y con mejor identidad visual.

## 2026-04-06 - Widget de cita + ampliación de layout en Home

- Herramienta: Copilot Chat
- Prompt: Mejorar Home para ocupar mejor el espacio, añadir cita educativa generada por modelo y botón de nueva cita.
- Resultado: Home con rejilla responsive amplia, tarjeta de cita con loading y fallback local.
- Justificación: La portada necesitaba contenido dinámico e impacto visual.

## 2026-04-06 - Despliegue seguro en Vercel

- Herramienta: Copilot Chat
- Prompt: Preparar despliegue en Vercel con variables de entorno y sin exponer token HF en frontend.
- Resultado: Integración por proxy `/api/hf`, eliminación de token hardcodeado, modo proxy en producción y ajustes en `vercel.json`.
- Justificación: Un token secreto no debe viajar en el bundle del navegador.

## 2026-04-06 - Fix de runtime Vercel (ESM/CommonJS)

- Herramienta: Copilot Chat
- Prompt: Corregir crash en función Vercel por conflicto de módulos (`Unexpected token 'export'`).
- Resultado: Reemplazo por función CommonJS en `api/hf.js` y retiro de variante TypeScript para evitar ambigüedad.
- Justificación: El runtime Node de Vercel estaba cargando en modo CommonJS.