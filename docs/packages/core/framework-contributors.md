# Core for Framework Contributors

This guide explains how to evolve `@wpkernel/core` while keeping the rest of the monorepo stable. Treat it as the companion to the architecture specs in `docs/internal/` and the public plugin developer guide.

## Confirm the contract surface

Start by inventorying exports in [`packages/core/src/index.ts`](../../packages/core/src/index.ts). Every new symbol must carry complete JSDoc (description, `@category`, and example when practical) so Typedoc reflects the change. Update this roadmap's [Docs Task ledger](../../internal/documentation-roadmap.md) when you add or retire exports.

Before refactoring, search for usages through the workspace to avoid breaking other packages. Keep the namespace helpers and error classes backwards compatible unless the migration spec says otherwise.

## Update specs before code

Significant runtime work begins in documentation. Amend the relevant spec-for example `configureWPKernel - Specification.md` for data runtime changes or `Architecture Cohesion Proposal.md` for registry updates-before touching the implementation. Link to the spec change from your pull request so reviewers can track intent.

When the spec alters developer experience, mirror it in the plugin developer guide and [`docs/packages/core.md`](../core.md). Coordinate with package owners listed in the roadmap to propagate follow-up tasks.

## Keep runtime diagnostics rich

Reporter calls and event emissions are our primary debugging surface. When adding new behaviours, ensure:

- lifecycle events use canonical names from `@wpkernel/core/contracts`
- reporter metadata includes `namespace`, `resourceName`, or `requestId` when available
- failure paths throw `WPKernelError` subclasses with actionable messages

If you introduce additional reporters or event payloads, add usage notes to the developer guide so plugin authors can respond to them.

## Prove changes in tests

Run `pnpm --filter @wpkernel/core test` followed by the root `pnpm typecheck` suites before sending a patch. Add targeted unit tests for new behaviour and expand fixtures in `@wpkernel/test-utils/core` if future contributors will need them.

For documentation-driven changes, update this guide and the roadmap checklists in the same commit so we never ship stale instructions.
