# QuizAI

Initial scaffold for the QuizAI project.

## Current state

- Angular 21 standalone bootstrap created.
- Core app folder structure created under `src/app/`.
- Sidebar shell and base route placeholders created.
- Generate page now has a functional local preview flow.
- Hugging Face service wired with environment-based configuration and fallback.
- Minimal home route available.
- Base docs created for the development workflow.

## Next phase

Quiz flow implementation for answering and reviewing results.

## Hugging Face configuration

Set the token and enable the model in `src/environments/environment.ts` before building against the API. If it stays disabled, the app uses the local quiz fallback.