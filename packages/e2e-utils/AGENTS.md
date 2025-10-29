# `@wpkernel/e2e-utils` - Package Guide for Agents

This package wraps the WordPress Playwright fixtures with kernel-aware helpers. Follow the root capabilities in `../../AGENTS.md` and the specifics below when editing it.

### Scope

Focus on Playwright fixture extensions (`test.ts`), the consolidated `createKernelUtils()` factory, and TypeScript types that consumers import in their tests. Architectural details are captured in `IMPLEMENTATION.md`; review it before making behavioural changes.

### Build & Test

Run `pnpm build --filter @wpkernel/e2e-utils` followed by `pnpm test --filter @wpkernel/e2e-utils`. If fixtures change, rerun the showcase Playwright suite to ensure integration parity.
New test-support exports live under `src/test-support/*.test-support.ts` and are re-exported from `src/index.ts`/`package.json`:

- `withIsolatedWorkspace` + `writeWorkspaceFiles` for workspace lifecycle management (agnostic helpers now live in `@wpkernel/test-utils/integration` and are re-exported here for compatibility)
- `collectManifestState` + `compareManifestStates` for declarative filesystem diffing in manifest specs
- `runNodeSnippet` for capturing Node CLI transcripts in tests

Prune helpers aggressively-if a helper is no longer referenced by a test suite, delete it instead of keeping dead exports around.

### Conventions

Keep helpers composable: expose utilities through the main factory rather than inventing parallel APIs. Preserve alignment with the WordPress Playwright patterns-fixtures should be extended, not replaced. Update `MIGRATION.md` and `README.md` whenever author-facing behaviour changes.

Use `@wpkernel/core/contracts` for namespaces or lifecycle constants inside helpers so browser code matches the framework contract.

### Cross-package dependencies

Check `docs/guide/adding-workspace-dependencies.md` before adjusting shared dependency wiring (tsconfig references, published entry points) so the E2E utilities stay aligned with sibling packages.
