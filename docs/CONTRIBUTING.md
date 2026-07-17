# Contributing

## Code of Conduct

This project follows Earth Guardians' community principles: respect, inclusion, collaboration. Harassment or discriminatory behavior is not tolerated.

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests: `pnpm test`
5. Run lint: `pnpm lint`
6. Commit with conventional commit messages
7. Open a pull request

## Development Setup

```bash
pnpm install
pnpm dev          # Development server at http://localhost:3000
pnpm test         # Run Vitest unit tests
pnpm test:e2e     # Run Playwright E2E tests
pnpm lint         # Run ESLint
pnpm generate     # Static site generation
```

## Environment Variables

Create a `.env` file from the template:

```env
NUXT_PUBLIC_MAPTILER_API_KEY=your_key
NUXT_PUBLIC_SUPABASE_URL=your_project_url
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Code Conventions

### TypeScript

- Strict mode enabled
- Define interfaces in `lib/types.ts` for all data structures
- Use explicit return types on composables

### Vue Components

- Use `<script setup>` with TypeScript
- `defineProps<{...}>()` for prop definitions
- `computed()` for derived state
- `onMounted()` for client-side initialization
- Use `useI18n()` for translated strings

### Styling

- Tailwind CSS utilities preferred over custom CSS
- CSS variables in `assets/css/main.css` for theming
- Dark mode via `.dark` class on `<html>`
- Responsive design with `clamp()` for fluid sizing

### i18n

Add translations for all user-facing strings:

1. Edit `locales/en.json` (base language)
2. Add same key to `locales/es.json`, `fr.json`, `pt.json`
3. Access via `t('path.to.key')`

## Testing

- Unit tests: Vitest (`tests/*.test.ts`)
- E2E tests: Playwright (`tests/*.spec.ts`)
- Run full suite: `pnpm test`
- Run specific test: `pnpm test -- tests/utils.test.ts`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include test coverage for new features
- Update documentation if adding/changing APIs
- Reference related issues

## Project Structure

See `docs/ARCHITECTURE.md` for detailed directory layout and component architecture.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
