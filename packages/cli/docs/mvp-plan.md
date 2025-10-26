# wpk CLI MVP Plan

_See [Docs Index](./index.md) for navigation._

> **Versioning reminder:** The CLI ships on the unified **v0.4.x (pre-1.0)** track. Tasks below reserve concrete version bumps-claim the slot before you start, update the status when you land, and consolidate into the parent phase release once every patch in that band ships.

## Coordination & guardrails

- **Non-negotiables:** Helpers that participate in the next pipeline must retain AST-first behaviour. Never introduce or wrap string-based PHP printers, and reserve the `create*` prefix for helpers produced by `createHelper` (alias third-party `create*` imports if needed).
- **Parallel runs:** Before picking up work, check the reserved version slot and set its status to `🚧 in-progress`. When your PR merges, flip the slot to `✓ shipped` and note the PR link so downstream phases can verify all prerequisites.
- **Required checks (baseline):** Every task runs at least `pnpm --filter @wpkernel/cli lint`, `pnpm --filter @wpkernel/cli typecheck`, `pnpm --filter @wpkernel/cli typecheck:tests`, and `pnpm --filter @wpkernel/cli test`. Tasks that touch the PHP driver also run `pnpm --filter @wpkernel/php-driver test`. Parent phase releases add the full suite listed in [CLI Migration Phases](./cli-migration-phases.md).
- **Version bumps happen last:** Reserve your slot up front, implement and review without touching package versions, then-after approvals and a fresh rebase-apply the bump across all packages/CHANGELOGs in a final commit before merging. Update the ledger entry with the PR link as you flip it to `✓ shipped`.
- **Snapshot updates:** When tests rely on Jest snapshots, rerun them with `pnpm --filter @wpkernel/cli test -u` and include the updated files in your patch.

### Reserved version ledger (0.4.x cycle – before Phase 1 minor)

| Slot  | Scope                                             | Status              | Notes                                                            |
| ----- | ------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| 0.4.1 | Task 1 – Harden PHP writer helper                 | ✓ shipped (this PR) | Coverage + logging guardrails landed via writer helper tests.    |
| 0.4.2 | Task 2 – Audit PHP builder helpers for AST purity | ⬜ available        | Verify all helpers use canonical factories + add tests.          |
| 0.4.3 | Task 3 – End-to-end generate coverage             | ⬜ available        | Use next workspace fixtures only.                                |
| 0.4.4 | Task 4 – Driver configuration & documentation     | ⬜ available        | Update docs + exports alongside code.                            |
| 0.4.5 | Phase 1 (wp-option parity) – AST builders land    | ⬜ available        | Implement controllers/helpers.                                   |
| 0.4.6 | Phase 1 – wp-option parity tests                  | ⬜ available        | Snapshot queued `PhpProgram` payloads.                           |
| 0.4.7 | Phase 1 – wp-option fixtures/docs                 | ⬜ available        | Refresh fixtures + docs to match AST output.                     |
| 0.4.8 | Buffer – hotfix for Phase 1 work                  | ⬜ available        | Optional safety slot before 0.5.0.                               |
| 0.4.9 | Release engineering prep                          | ⬜ available        | Changelog rollup + release PR immediately before 0.5.0.          |
| 0.5.0 | **Phase 1 minor**                                 | ⬜ pending          | Requires every 0.4.x slot to be ✓. Follow the release checklist. |

## Definition of "MVP"

We consider the CLI ready for the MVP launch when the following are true:

1. Builders emit AST-driven artefacts for every supported storage mode (wp-post, wp-taxonomy, wp-option, transient) and blocks.
2. Block generation runs through the next pipeline (manifests/registrars/render templates) with no reliance on string-based printers.
3. `wpk apply` updates user shims that extend generated classes, honours all safety flags, and logs actions.
4. Pipeline helpers expose configuration hooks (e.g., PHP driver options) without deep imports, and integration tests cover end-to-end `generate` + `apply` flows.
5. All documentation (`cli-migration-phases.md`, `php-ast-migration-tasks.md`, `apply-workflow-phases.md`, `adapter-dx.md`, `pipeline-integration-tasks.md`) reflects the current architecture.

## Task evaluation workflow

When opening any task below, instruct the agent as follows:

```
Evaluate {Task Name} #{Task ID}. Read all linked documentation and consider the scope of work. Look at the current state and tell me if this can be completed in a single run. Otherwise, propose a scoped plan to complete it in smaller steps.
```

Before coding, the agent must review `AGENTS.md`, the referenced documentation, and the code paths noted in the task. Every task assumes the next-generation pipeline (`packages/cli/src/next/**`) is the only surface to touch-do not revive string-based printers or helper naming patterns reserved for the pipeline (e.g., no new `create*` exports unless they are pipeline helpers).

## Task queue

| ID  | Task                                     | Summary & Scope                                                                                                                                                                                  | Reserved version                            | Required checks                                                              |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Harden PHP writer helper                 | Add coverage for fallback AST serialisation, reporter calls, and empty-channel behaviour in `createPhpProgramWriterHelper`.                                                                      | 0.4.1 (patch)                               | Baseline + `pnpm --filter @wpkernel/cli test -- --testPathPatterns writer`   |
| 2   | Audit PHP builder helpers for AST purity | Walk `packages/cli/src/next/builders/php/**` to ensure every helper uses `@wpkernel/php-json-ast` factories, removing legacy scaffolding and updating fixtures/tests for schema conformance.     | 0.4.2 (patch)                               | Baseline + `pnpm --filter @wpkernel/cli test --testPathPattern=builders/php` |
| 3   | End-to-end generate coverage             | Execute the PHP builder + writer against a workspace fixture and assert emitted `.php`/`.ast.json` files without touching string-based printers.                                                 | 0.4.3 (patch)                               | Baseline + `pnpm --filter @wpkernel/test-utils test`                         |
| 4   | Driver configuration & documentation     | Thread optional PHP driver settings (binary, script path, import meta URL) through `createPhpBuilder`/`createPhpProgramWriterHelper`, update exports, and document the knobs.                    | 0.4.4 (patch)                               | Baseline + `pnpm --filter @wpkernel/php-driver test`                         |
| 5   | Blocks builder                           | Implement a next-gen blocks builder (SSR + JS-only) that stages manifests/registrars/render templates via the workspace transaction and migrate tests. Unlocks once Phase 2 (0.6.0) is complete. | 0.6.1 (patch – available after 0.6.0 ships) | Baseline + `pnpm --filter @wpkernel/cli test -u` (update block snapshots)    |
| 6   | wp-option AST parity                     | Build wp-option controllers/helpers in `packages/cli/src/next/builders/php/resource/**`, add tests, update fixtures, and remove dependency on `printers/php/wp-option.ts`.                       | 0.4.5–0.4.7 (patch band) → 0.5.0 minor      | Baseline + `pnpm --filter @wpkernel/cli test --testPathPattern=wp-option`    |
| 7   | Transient AST parity                     | Port transient controllers/helpers to the AST pipeline with full test coverage, matching behaviour in `printers/php/transient.ts`.                                                               | 0.5.1–0.5.3 (patch band) → 0.6.0 minor      | Baseline + `pnpm --filter @wpkernel/cli test --testPathPattern=transient`    |
| 8   | Apply layering & flags                   | Emit user extension shims, port `--yes/--backup/--force` handling, `.wpk-apply.log`, and add integration tests for the new workflow.                                                             | 0.8.1–0.8.3 (patch band) → 0.9.0 minor      | Baseline + end-to-end `wpk apply` smoke run                                  |
| 9   | Update documentation & lint links        | After code tasks complete, ensure all documentation and lint rule links reflect the final state.                                                                                                 | Use next available patch in active cycle    | Baseline + `pnpm lint --fix`                                                 |

Each task should be executed independently; if a task proves too large for a single agent run, the agent must scope it into smaller follow-up tasks using the evaluation workflow above.

Task 1 is now ✓ shipped (this PR). The writer helper tests cover fallback AST serialisation, the empty-channel guard, and reporter debug output; treat those assertions as baseline coverage for future changes.
