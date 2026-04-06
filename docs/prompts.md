# Prompts Log

## 2026-04-06

- Tool: Copilot Chat
- Prompt: Generate the full project scaffold from `INSTRUCCIONES_MEJORADAS.md` and wait for confirmation between phases.
- Result: Defined a phased plan and created the initial Angular scaffold in phase 1.
- Justification: Needed a controlled rollout to avoid mixing scaffold, layout, and feature work.

## 2026-04-06 - Phase 2

- Tool: Copilot Chat
- Prompt: Continue with point 2 and implement the folder structure.
- Result: Created the `src/app/` substructure for core, layout, pages, and shared code.
- Justification: The tree needs to exist before layout and feature work can be added cleanly.

## 2026-04-06 - Phase 3

- Tool: Copilot Chat
- Prompt: Continue with point 3 and build the sidebar and layout base.
- Result: Added the persistent sidebar shell and placeholder section routes.
- Justification: The main navigation and visual frame need to exist before page-specific work.

## 2026-04-06 - Phase 4

- Tool: Copilot Chat
- Prompt: Continue with point 4 and make the generate page functional without Hugging Face yet.
- Result: Added topic input, difficulty selector, loading state, validation, and local quiz preview generation.
- Justification: The generation screen must be usable before integrating the remote model.

## 2026-04-06 - Phase 5

- Tool: Copilot Chat
- Prompt: Continue with point 5 and integrate Hugging Face Model 1 for quiz generation.
- Result: Added a reusable Hugging Face service, environment-based API configuration, API parsing, and fallback generation.
- Justification: The app needs a real remote model path with a safe fallback when the service is unavailable.

## 2026-04-06 - HF rollback

- Tool: Copilot Chat
- Prompt: Undo the runtime config change and restore the original environment-based setup.
- Result: Removed runtime Hugging Face setup from UI/localStorage and restored environment-based flow.
- Justification: The reported issue was missing token configuration, not the baseline implementation.

## 2026-04-06 - HF dev request + model switch

- Tool: Copilot Chat
- Prompt: Fix missing request behavior and switch to meta-llama/Llama-3.1-8B-Instruct because the previous model is unavailable.
- Result: Enabled development environment requests, aligned prod/dev model config to Llama 3.1 8B Instruct, and preserved prompt trace history.
- Justification: `ng serve` uses `environment.ts`; with `enabled=false` and empty token there was no outbound request.

## 2026-04-06 - HF router compatibility update

- Tool: Copilot Chat
- Prompt: Use the official Hugging Face Router OpenAI-compatible chat completion pattern and switch model to `meta-llama/Llama-3.1-8B-Instruct:novita`.
- Result: Migrated generation requests to `https://router.huggingface.co/v1/chat/completions`, updated model id with provider suffix, and removed silent fallback on malformed remote responses.
- Justification: The previous inference endpoint/model path was not reliable for this model and made troubleshooting difficult due to fallback masking errors.

## 2026-04-06 - HF response normalization fix

- Tool: Copilot Chat
- Prompt: Fix generation where the first question appears and the rest break or render without answers, based on screenshots in `referencias/errors/`.
- Result: Hardened response parsing to normalize mixed question/option formats and always produce 4 iterable options with a valid correct index.
- Justification: The model can return options as strings or objects; Angular template expects iterable arrays and crashed with NG02200.

## 2026-04-06 - Reapply after git conflict

- Tool: Copilot Chat
- Prompt: Reapply the generation parsing fix after a merge conflict reverted it.
- Result: Restored robust normalization logic to avoid partial rendering and missing options.
- Justification: Conflict resolution accidentally removed the parser hardening and reintroduced the same UI failure.

## 2026-04-06 - Variable question count + interactive submit

- Tool: Copilot Chat
- Prompt: Support prompts like "Crea un cuestionario de 20 preguntas de programación" and allow selecting answers plus submitting the test.
- Result: Added automatic question-count detection from free text, passed question count to HF/fallback generation, and implemented answer selection with submit/reset and score display.
- Justification: The generated quiz needed to be actionable, not just preview-only, and must respect user-requested question counts.

## 2026-04-06 - Generate session persistence

- Tool: Copilot Chat
- Prompt: Keep the test state in generate route when navigating away and back (selected answers, submission state, etc.).
- Result: Added temporary persistence and restoration of generate state via `localStorage` (quiz, answers, submitted flag, score, topic, and status messages).
- Justification: The user flow requires continuity while browsing other routes without losing in-progress answers.

## 2026-04-06 - Preview-only generate + dedicated quiz route

- Tool: Copilot Chat
- Prompt: Show only preview in generate and move quiz resolution to its specific route with one-question-per-page flow and final result.
- Result: Refactored generate to start quiz sessions, created `/quiz/:id` interactive route, and persisted quiz session state in `localStorage`.
- Justification: Generation and resolution needed clear separation, plus route-safe progress continuity.

## 2026-04-06 - History implementation

- Tool: Copilot Chat
- Prompt: Implement history for partial/completed quizzes with repeat and delete.
- Result: Added functional `/history` page with search/status/difficulty filters and actions to continue, repeat, and delete saved sessions.
- Justification: The workflow requires managing quizzes beyond a single run, including in-progress recovery and replay.

## 2026-04-06 - Stats implementation

- Tool: Copilot Chat
- Prompt: Continue with metrics by implementing a functional stats page.
- Result: Added `/stats` dashboard with totals, global accuracy, streaks, and category accuracy bars from persisted sessions.
- Justification: The project requires measurable learning progress beyond raw history listings.

## 2026-04-06 - HF Model 2 naming/classification

- Tool: Copilot Chat
- Prompt: Use a second model to correctly name each generated test.
- Result: Added a second HF call for quiz metadata (`title`, `category`) after question generation, with robust fallback on failures.
- Justification: Separating content generation from naming/classification improves title consistency and downstream analytics quality.

## 2026-04-06 - Image per quiz + gallery history

- Tool: Copilot Chat
- Prompt: Integrate text-to-image generation (`stabilityai/stable-diffusion-xl-base-1.0`) and store output as base64 for each quiz.
- Result: Added image generation call, blob-to-base64 conversion, session persistence, and gallery-style History cards (image + title).
- Justification: The product requires a visual identity per quiz and a gallery browsing experience in History.

## 2026-04-06 - Image placeholder fix

- Tool: Copilot Chat
- Prompt: Fix history cards showing placeholders only despite image generation integration.
- Result: Added robust image response parsing (binary and JSON), model-loading retry logic, and delayed retries before fallback.
- Justification: HF image endpoints can return JSON loading/error payloads before returning binary images; handling this avoids false null images.