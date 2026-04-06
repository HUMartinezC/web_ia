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

`src/environments/environment.ts` is only for local flags and fallback behavior.
Do not store a secret Hugging Face token in Angular environment files for production, because it ends up in the browser bundle.

For Vercel, the secure setup is:
- keep the frontend calling a backend endpoint or Vercel Function
- store the token as a Vercel environment variable
- let the backend add the `Authorization` header when talking to Hugging Face

If the API remains disabled, the app uses the local quiz fallback.

## Vercel deployment checklist

The project is configured for Vercel with:
- Angular static build output: `dist/quizai/browser`
- SPA fallback rewrite to `index.html`
- Serverless proxy at `api/hf.js` for Hugging Face calls

Required Vercel environment variable:
- `HF_API_TOKEN` (Project Settings -> Environment Variables)

Recommended values and scope:
- Name: `HF_API_TOKEN`
- Value: your Hugging Face token (`hf_...`)
- Environments: Production, Preview, Development (if you also test Vercel Preview)

Important:
- Do not place Hugging Face secrets in Angular environment files.
- After creating/updating `HF_API_TOKEN`, trigger a new Vercel deployment so the function picks the new value.