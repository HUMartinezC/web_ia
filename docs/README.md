# QuizAI

Aplicación web educativa para generar y resolver cuestionarios con IA usando Angular 21 + Hugging Face.

## Resumen

QuizAI permite:

- Generar quizzes a partir de un tema y dificultad.
- Resolver quizzes en flujo interactivo pregunta por pregunta.
- Guardar historial y repetir intentos.
- Medir progreso con métricas globales y por categoría.
- Crear portada visual por quiz mediante generación de imagen.

La app está diseñada con una estética retro-escolar y contenido en español.

## Demo funcional

Flujo recomendado para la presentación:

1. Ir a Home y mostrar la cita educativa dinámica.
2. Entrar en Generate, crear un quiz con un tema concreto y dificultad.
3. Mostrar la previsualización y comenzar el quiz.
4. Resolver preguntas en la ruta de quiz y finalizar.
5. Abrir History para enseñar la galería (imagen + título + estado).
6. Abrir Stats para revisar precisión global, rachas y categorías.

## Funcionalidades clave

- Generación de preguntas con IA (modelo de chat).
- Clasificación por categorías (zero-shot con BART MNLI).
- Generación de imagen por quiz y persistencia en base64.
- Historial con filtros, repetición, eliminación individual y borrado masivo.
- Sidebar con navegación principal y contador de quizzes completados hoy.
- Persistencia local de sesiones de quiz con localStorage.

## Arquitectura técnica

- Framework: Angular 21 con standalone components.
- Estado: Signals nativos + almacenamiento local.
- Integración IA: servicio central en `src/app/core/services/huggingface.service.ts`.
- Proxy backend para token seguro: `api/hf.js`.
- Configuración de entorno: `src/environments/environment.ts` y `src/environments/environment.prod.ts`.

## Modelos de IA usados

- Generación de quiz y título: `meta-llama/Llama-3.1-8B-Instruct:novita`
- Clasificación de categorías: `facebook/bart-large-mnli`
- Imagen por quiz: `stabilityai/stable-diffusion-xl-base-1.0`

## Ejecutar en local

Requisitos:

- Node.js 20+
- npm

Pasos:

```bash
npm install
npm start
```

Build de producción local:

```bash
npm run build
```

## Despliegue en Vercel

Configuración recomendada del proyecto en Vercel:

- Build Command: `npm run build`
- Output Directory: `dist/quizai/browser`
- Root Directory: `./`

Variable de entorno obligatoria:

- `HF_API_TOKEN` con un token válido de Hugging Face.

Cómo funciona la seguridad del token:

- El frontend no envía Authorization directamente en producción.
- Las llamadas pasan por `api/hf.js`.
- La función serverless añade el header Bearer usando `HF_API_TOKEN`.

Después de crear o actualizar variables en Vercel:

1. Guardar cambios en Environment Variables.
2. Ejecutar redeploy (mejor sin cache en caso de incidencias).

## Estructura de documentación

- `docs/README.md`: visión general y guía de uso.
- `docs/architecture.md`: decisiones de arquitectura y diseño técnico.
- `docs/prompts.md`: registro cronológico de prompts usados.
- `docs/ai-tools.md`: herramientas IA utilizadas y valoración.
- `docs/reflections.md`: incidencias, soluciones y aprendizajes.

## Puntos fuertes para exponer en clase

- Separación clara entre generación, resolución, historial y métricas.
- Integración de múltiples modelos con responsabilidades distintas.
- Manejo de errores y fallback local cuando falla la IA.
- Seguridad en despliegue: token fuera del bundle frontend.
- Evolución iterativa guiada por prompts documentados.

## Estado actual

- Base visual y layout: completado.
- Generación de quizzes: completado.
- Flujo de quiz: completado.
- Historial y métricas: completado.
- Assets y despliegue en Vercel: completado.
- Documentación final: en cierre.