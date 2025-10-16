# `@wpkernel/ui` - Package-specific Agent Rules

This file supplements the root [AGENTS.md](../../AGENTS.md) with agent guidelines specific to the UI package.

---

## Build & Test

- Build: `pnpm build`
- Test: `pnpm test`
- Verify no `@wordpress/*` packages are bundled; all are peer dependencies.
- Shared helpers: use `tests/ui-harness.test-support.ts` for runtime + provider setup and `tests/dom-observer.test-support.ts` for `IntersectionObserver`/`requestAnimationFrame` mocks.
- DataView specs should import from `src/dataviews/test-support/ResourceDataView.test-support.tsx` for the full helper surface (`createKernelRuntime`, `renderResourceDataView`, `renderActionScenario`, `buildListResource`, `buildActionConfig`, `createConfig`, `createResource`, `createDataViewsTestController`, and `flushDataViews`). Do **not** reimplement DataViews mocks, pagination controllers, or selection plumbing in individual specs-extend the harness when shared behaviour is missing and add accompanying self-tests.
- Run `pnpm --filter @wpkernel/ui typecheck:tests` after editing `.test-support.ts` helpers; they are omitted from the production build but validated via the tests TypeScript project.

---

## UI Package Conventions

- Wrap `@wordpress/components` lightly; mirror WP props/types/events.
- Implement canonical async UX states with `AsyncBoundary`: idle, loading, empty, error, success.
- Use `ActionButton` for all write operations; avoid direct transport calls.
- Read data via `ResourceList` connected to resource stores; no ad-hoc fetching.
- Accessibility is mandatory: semantic HTML, ARIA roles, keyboard nav, focus management.
- Use `@wordpress/i18n` for all user-facing strings.
- No internal theming engine; respect WP admin/editor CSS vars and dark mode.
- Try to keep code and test files <=500 SLOC for ease of debugging and maintanence.

---

## PR Checklist (UI Package)

- `pnpm typecheck` and `pnpm typecheck:tests` pass.
- Tests cover all async states and action error handling.
- Accessibility checks pass (axe).
- No bundling of WordPress externals.
- CHANGELOG.md entry added in affected packages.
- No deep imports across monorepo packages, only what is exposed as public API. If something critical or useful is not exposed, adjust framework exports accordingly
- Always use `.github/PULL_REQUEST_TEMPLATE.md` - no ad-hoc PRs

---

## Coordination

- Coordinate with the kernel package when UI hooks depend on new instance APIs; specs must be updated in lockstep.
- Mention affected docs (see `../../docs/AGENTS.md`) when publishing UI-facing API changes.

See [../../AGENTS.md](../../AGENTS.md) for shared monorepo agent policies.
