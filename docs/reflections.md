# Reflexiones

## 2026-04-06

- Empezar con un scaffold mínimo fue correcto: permitió construir estructura y layout sin deuda temprana.
- Separar generación (`/generate`) y resolución (`/quiz/:id`) simplificó el estado y la mantenibilidad.
- Persistir sesiones en `localStorage` mejoró mucho la experiencia al retomar quizzes interrumpidos.
- Las respuestas de modelos IA no siempre respetan el esquema esperado; la normalización de parser fue imprescindible.
- Garantizar siempre 4 opciones por pregunta evitó errores de renderizado en Angular.
- El fallback local fue clave para seguir probando cuando hubo fallos de token, red o límites de Hugging Face.
- Integrar un segundo modelo para clasificación mejoró consistencia de categorías y utilidad de estadísticas.
- Añadir imagen por quiz potenció la identidad visual y la utilidad de History en formato galería.
- Traducir la interfaz completa al español mejoró claridad para la demo y coherencia del producto.
- El despliegue en Vercel con proxy serverless resolvió la seguridad del token en frontend.
- Lección crítica: no hardcodear secretos en `environment` porque quedan expuestos en el bundle.
- Lección de despliegue: forzar CommonJS en la función (`api/hf.js`) evitó errores ESM/CJS en runtime.