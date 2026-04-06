# Architecture Notes

## Initial decisions

- Angular 21 with standalone components.
- Router enabled from the bootstrap layer.
- `provideHttpClient()` and `provideAnimations()` configured from `app.config.ts`.
- No state library added in the scaffold.

## Scope of this phase

This phase only establishes the project shell and a minimal landing route.