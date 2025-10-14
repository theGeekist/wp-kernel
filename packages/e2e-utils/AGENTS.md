# `@wpkernel/e2e-utils` – Package Guide for Agents

This package wraps the WordPress Playwright fixtures with kernel-aware helpers. Follow the root policies in `../../AGENTS.md` and the specifics below when editing it.

### Scope

Focus on Playwright fixture extensions (`test.ts`), the consolidated `createKernelUtils()` factory, and TypeScript types that consumers import in their tests. Architectural details are captured in `IMPLEMENTATION.md`; review it before making behavioural changes.

### Build & Test

Run `pnpm build --filter @wpkernel/e2e-utils` followed by `pnpm test --filter @wpkernel/e2e-utils`. If fixtures change, rerun the showcase Playwright suite to ensure integration parity.

### Conventions

Keep helpers composable: expose utilities through the main factory rather than inventing parallel APIs. Preserve alignment with the WordPress Playwright patterns-fixtures should be extended, not replaced. Update `MIGRATION.md` and `README.md` whenever author-facing behaviour changes.

Use `@wpkernel/core/contracts` for namespaces or lifecycle constants inside helpers so browser code matches the framework contract.
