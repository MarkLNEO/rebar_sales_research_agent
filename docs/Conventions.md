# Conventions

## Code style

- TypeScript strict mode on; prefer explicit types for exported functions
- No snake_case in user-visible content; humanize labels in renderers
- Keep UI components presentational; move logic into hooks/services where practical

## File layout

- API routes: `app/api/**/route.ts`
- UI components: `src/components/*`
- Page logic: `src/page-components/*`
- Cross-layer logic: `shared/*`
- Utilities: `src/utils/*`

## Naming

- Components: PascalCase
- Hooks: useXxx
- Files: kebab-case (except React components)
- Data test ids: `data-testid="meaningful-id"`

