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