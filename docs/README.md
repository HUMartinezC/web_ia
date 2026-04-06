# QuizAI

Initial scaffold for the QuizAI project.

## Current state

- Angular 21 standalone bootstrap created.
- Core app folder structure created under `src/app/`.
- Sidebar shell and base route placeholders created.
- Generate page now provides preview-only flow and starts quiz sessions.
- Dedicated `/quiz/:id` route implements one-question-per-page solving.
- History page now lists in-progress/completed quizzes with continue, repeat, and delete actions.
- Stats page now shows global metrics, streaks, and accuracy by category.
- Hugging Face service now uses Model 1 for question generation and Model 2 for title/category enrichment.
- Each generated quiz now attempts to create an IA cover image, persisted as base64 in localStorage.
- History now renders as a gallery of quiz cards (image + title) with existing actions and filters.
- Minimal home route available.
- Base docs created for the development workflow.

## Next phase

Category classification integration (HF Model 2) and final deployment.

## Hugging Face configuration

Set the token and enable the model in `src/environments/environment.ts` before building against the API. If it stays disabled, the app uses the local quiz fallback.