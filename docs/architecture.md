# Notas de Arquitectura

## Decisiones iniciales

- Angular 21 con standalone components.
- Router habilitado desde la capa de bootstrap.
- `provideHttpClient()` y `provideAnimations()` configurados desde `app.config.ts`.
- Sin librería de estado externa: solo APIs nativas de Angular.

## Estructura y organización

La estructura de carpetas se creó antes de desarrollar funcionalidades para mantener una base estable:

- `core/` para servicios y modelos.
- `layout/` para shell y navegación.
- `pages/` para vistas principales.
- `shared/` para componentes reutilizables.

Este enfoque evitó refactors tempranos cuando se añadieron generación, historial y métricas.

## Shell de aplicación

La app usa un layout persistente con sidebar y área de contenido (`router-outlet`).

Ventajas:

- Navegación consistente en todas las rutas.
- Menor complejidad al construir páginas por fases.
- Mejor base responsive para móvil y escritorio.

## Flujo funcional

Se separaron claramente dos responsabilidades:

- `generate`: creación y previsualización del quiz.
- `quiz/:id`: resolución interactiva pregunta por pregunta.

La separación reduce acoplamiento y simplifica el estado de cada pantalla.

## Integración con Hugging Face

La integración principal usa Hugging Face Router con tres capacidades:

- Generación de preguntas (modelo de chat).
- Clasificación de categorías (zero-shot).
- Generación de imagen por quiz (text-to-image).

### Pipeline de generación

1. Se generan preguntas y respuestas.
2. Se refina metadato del quiz (`title`, `category`, `categories`).
3. Se genera portada visual del quiz.

Si alguna fase falla, se aplican fallbacks para mantener la experiencia utilizable.

## Persistencia y sesiones

`QuizSessionService` guarda sesiones en `localStorage` y permite:

- Continuar quizzes incompletos.
- Repetir quizzes finalizados.
- Restaurar estado de respuestas, progreso y puntuación.

También incluye normalización/migración para sesiones antiguas.

## Historial

La vista de historial trabaja como galería visual:

- Tarjetas con imagen, título, fecha, dificultad y estado.
- Filtros por texto, estado y dificultad.
- Acciones de continuar, repetir, eliminar y borrar todo.

## Métricas

La página de estadísticas calcula sobre sesiones completadas:

- Total de quizzes.
- Precisión global.
- Racha actual y récord.
- Rendimiento por categoría.

Esto evita sesgos al excluir intentos incompletos.

## Despliegue y seguridad

El despliegue objetivo es Vercel.

- Frontend estático: `dist/edupravia/browser`.
- Proxy serverless: `api/hf.js`.

El token de Hugging Face (`HF_API_TOKEN`) se mantiene en variables de entorno de Vercel y no en el bundle frontend.