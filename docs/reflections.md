# Reflections

## 2026-04-06

- Keep the scaffold minimal so the next phase can focus on structure and layout without refactoring the bootstrap.
- The repo started with only instructions and references, so creating the Angular shell first was the correct first step.
- Creating empty folder markers is enough for this phase; real components and services should arrive in the next steps.
- A persistent shell is a good boundary: the next phases can replace page placeholders without changing app-wide layout.
- The generation page benefits from a local preview generator first; it reduces risk before remote model integration.
- For Hugging Face, a fallback path is essential so the UI stays testable when the API token is absent or the model is rate-limited.
- In Angular local runs, `environment.ts` is the active config; setting only `environment.prod.ts` does not trigger remote calls during `ng serve`.
- Model availability can change by endpoint/provider; keeping model id configurable avoids dead integrations when one model is unavailable.
- OpenAI-compatible HF Router endpoints are often a better fit for instruction/chat models than legacy text-generation inference routes.
- Silent fallback can hide real integration failures; explicit errors are more useful while stabilizing provider connectivity.
- HF responses may not strictly respect schema types (e.g., `options` as string/object); parser normalization is required before binding in Angular templates.
- Guaranteeing 4 options per question prevents broken preview cards and avoids NG02200 iterable errors.
- Parsing quantity expressions (e.g., "20 preguntas") directly from the free-text prompt keeps UX simple while still allowing configurable quiz size.
- A generated preview should be interactive; adding selection, submit, and score flow exposes data-quality issues much earlier.
- Route changes in SPA flows can silently reset component state; persisting in-progress quiz data avoids user frustration.
- Session restoration needs normalization of answer arrays against current quiz length to avoid inconsistent UI states.
- Keeping `generate` as preview-only and moving answer flow to `/quiz/:id` reduces component complexity and clarifies user intent.
- A per-question route flow makes progress and submission logic easier to maintain than mixing it inside generation preview.
- History management works best when session actions are explicit: continue for progress, duplicate for replay, delete for cleanup.
- Sorting sessions by last update time keeps active work visible and reduces friction for interrupted quizzes.
- Stats become much more useful when based only on submitted sessions; mixing in-progress data would skew accuracy.
- A heuristic category pass is acceptable as intermediate step, but replacing it with Model 2 classification will improve consistency.