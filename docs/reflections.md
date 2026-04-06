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