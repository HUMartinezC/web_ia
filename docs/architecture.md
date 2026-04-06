# Architecture Notes

## Initial decisions

- Angular 21 with standalone components.
- Router enabled from the bootstrap layer.
- `provideHttpClient()` and `provideAnimations()` configured from `app.config.ts`.
- No state library added in the scaffold.

## Scope of this phase

This phase only establishes the project shell and a minimal landing route.

## Folder structure

The app folders were created in advance of implementation so that services,
models, layout, pages, and shared UI can be added without reshaping the tree later.

## Layout shell

The current shell uses a persistent sidebar and a content frame around the router outlet.
This keeps navigation stable while the feature pages are built in later phases.

## Generate page behavior

The generate screen is preview-only: it builds a quiz and starts a route-based session.
Quiz resolution is handled in `/quiz/:id` to keep generation and answering concerns separated.

## Hugging Face integration

The app uses the Hugging Face Router endpoint (chat-completions) with configurable model ids and bearer token.
If the API is disabled or unavailable, the service falls back to a deterministic local quiz builder so the UI remains usable.

Generation follows a two-step pipeline:
- Model 1 generates quiz questions/options/correct answers.
- Model 2 refines quiz metadata (`title` and `category`) for better naming consistency.

If Model 2 fails, metadata falls back to deterministic naming and `General` category.

For visual assets, the app now calls `stabilityai/stable-diffusion-xl-base-1.0` (HF text-to-image)
to generate one cover image per quiz. The returned image blob is resized, encoded to base64,
and persisted inside the quiz session to support offline gallery rendering in History.

## Quiz sessions

`QuizSessionService` stores quiz sessions in `localStorage` and restores progress by id.
This keeps selected answers, navigation index, submitted state, and score when users change routes.

## History page

The history screen reads persisted sessions and supports filtering plus session lifecycle actions:
continue, repeat (duplicate), and delete.

## Stats page

The stats screen aggregates completed sessions to compute total quizzes, global accuracy,
current streak, best streak, and category-level performance bars.
Category grouping first uses saved quiz metadata and only falls back to topic keyword heuristics for older sessions.