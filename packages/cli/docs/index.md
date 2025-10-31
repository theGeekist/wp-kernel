# CLI Docs Index

Keep this page updated-edit or prune entries as soon as a referenced document changes.

- **Version guard** - The CLI operates on the unified **v0.10.x (pre-1.0)** line. Reserved version slots live in [MVP Plan](./mvp-plan.md); claim and update them as tasks ship so parallel agents never collide.
- **Implementation rules** - All downstream work must keep the AST-first pipeline intact: no string-based PHP generation, and reserve the `create*` prefix for helpers produced via `createHelper`. Alias third-party `create*` imports to avoid collisions.
- **[CLI Migration Phases](./cli-migration-phases.md)** - canonical contributor brief for the next pipeline (runtime, helpers, command status, workstreams).
- **[PHP AST Migration Tasks](./php-ast-migration-tasks.md)** - archive of the wp-option/transient/block parity milestones and controller safety work that preceded the printer retirement.
- **[Block Printer Parity](./block-printer-parity.md)** - legacy JS-only/SSR printer behaviour that Phase 3 builders must mirror.
- **[Apply Workflow Phases](./apply-workflow-phases.md)** - record of the layered apply rollout (shims, flags, logging) and the 0.9.0 release checklist.
- **[Command Migration & Parity Plan](./command-migration-plan.md)** - canonical summary of the fully migrated command surface (`apply`, `generate`, `init`, `create`, `start`, `doctor`) and the remaining polish checkpoints.
- **[Phase 6 – Core Pipeline Orchestration](../core/docs/phase-6-core-pipeline.md.md)** - active core spec for Tasks 32-36; update CLI docs when statuses change in the MVP ledger.
- **[Phase 7 – Plugin bootstrap flow](./phase-7-plugin-bootstrap.md)** - spec for Tasks 37-45 covering the bootstrap workspace, loader generator, regeneration cleanup, activation docs, and release checkpoints.
- **[@wpkernel/create-wpk README](../create-wpk/README.md)** - bootstrap entry point for `npm|pnpm|yarn create @wpkernel/wpk`, including telemetry notes and the integration coverage expectations from Task 38.
- **[Adapter DX](./adapter-dx.md)** - current adapter/extension surface (IR-first hooks, sandboxed writes, future recipe roadmap; includes lint rule intent).
- **[Pipeline Integration Tasks](./pipeline-integration-tasks.md)** - scoped tasks for hardening the next pipeline (writer coverage, pretty-printer fixes, integration tests, driver configuration). Contains the CLI smoke-test commands (`pnpm --filter @wpkernel/core build`, `pnpm --filter @wpkernel/cli build`, then run `wpk generate --dry-run`/`wpk generate`).
- **[MVP Plan](./mvp-plan.md)** - definition of the MVP launch criteria and the task queue for parallel execution.
- **[PHP JSON Schema Reference](./php-json-schema.md)** - background on the nikic/PHP-Parser JSON representation used by `@wpkernel/php-json-ast`.
- **[PHP JSON AST Migration](./php-json-ast-migration.md)** - redirect to the AST task tracker (left for backwards compatibility).

Every document should include a backlink to this index (e.g. “See [Docs Index](./index.md)”) so readers can navigate easily.
