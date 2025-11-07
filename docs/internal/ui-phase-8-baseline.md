# Phase 8 - UI baseline experience

_Internal planning reference: [`cli-mvp-plan.md`](cli-mvp-plan.md)_

Phase 8 converts the IR V1 resource contract into a complete and functional WordPress admin UI experience. It delivers DataViews defaults, consistent async UX, full capability and action wiring, and an interactivity bridge so authors describe a resource once and immediately receive working, polished admin screens. The CLI closes the phase by emitting the richer UI metadata, enqueuing runtime assets, and scaffolding the interactivity bindings.

## Objectives (All Completed)

- **DataViews schema expansion** - `attachUIBindings()` auto-registers controllers with server-derived map/query metadata, saved layouts, view defaults, and menu hints from `wpk.config.ts`. Generated screens now reflect the full IR contract without manual controller definitions.
- **Shared async UX** - All DataViews surfaces include standard loading/empty/error/permission-denied boundaries, action notices, and unified reporter-driven diagnostics.
- **Interactivity bridge** - `createDataViewInteraction()` synchronizes filters, selection, and cache-hydration with `defineInteraction`, enabling DataViews controllers to drive WP interactivity and cache invalidation flows automatically.
- **Observability & events** - Structured events (`registered`, `viewChanged`, `actionTriggered`, `permissionDenied`, `fetchFailed`) are fully exposed, with reporter channels and optional WordPress hooks integration.
- **CLI alignment** - CLI generators emit UI metadata, interactivity scaffolds, menu registrations, enqueue plans, and `.generated/ui/registry/dataviews/*` manifests. Regeneration handles stale entries, snapshots expanded output, and wires interactivity assets.
- **Minor release** - Finalized Phase 8 with a coordinated 0.12.0 cut (core/ui/cli), updated docs, refreshed fixtures, validated dry-run apply pipeline, and synced runtime stabilizations.

## Release ledger

| Slot   | Task                                  | Status     | Summary                                                                                                                               | Key references                                                                  |
| ------ | ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0.11.1 | Task 46 - DataViews schema expansion  | ✓ Complete | Auto-registration of DataViews including saved layouts, mapQuery, server-driven columns, and menu metadata.                           | `attachUIBindings.ts`, `dataviews/types.ts`                                     |
| 0.11.2 | Task 47 - Async boundaries & notices  | ✓ Complete | Shared loading/empty/error/permission boundaries and action notices integrated with controller reporters.                             | `ResourceDataView.tsx`, `ResourceDataViewBoundary.tsx`, `useDataViewActions.ts` |
| 0.11.3 | Task 48 - Interactivity bridge        | ✓ Complete | `createDataViewInteraction()` syncs view state + selections into `defineInteraction` and cache hydration pipelines.                   | `attachUIBindings.ts`, `defineInteraction.ts`                                   |
| 0.11.4 | Task 49 - Observability & hooks       | ✓ Complete | Lifecycle events, structured reporter channels, and optional WP hooks for DataViews.                                                  | `dataviews/events.ts`, `resource-controller.ts`                                 |
| 0.11.5 | Task 50 - CLI DataView alignment      | ✓ Complete | CLI emits the richer DataViews metadata, updates manifests, snapshots registry, and enqueues UI bundles based on config.              | `generate.ts`, `workspace/filesystem.ts`                                        |
| 0.11.6 | Task 51 - CLI interactivity scaffolds | ✓ Complete | CLI scaffolds `data-wp-*` bindings, enqueues `wp.interactivity`, and emits fixtures demonstrating DataView+interactivity composition. | `generate.ts`, `defineInteraction.ts`                                           |
| 0.12.0 | Task 52 - Phase 8 minor release       | ✓ Complete | Consolidated 0.12.0 release, changelog sync, docs refresh, fixture regeneration, and E2E dry-run validation.                          | Phase ledger                                                                    |

## Task breakdown (Final State)

### Patch 0.11.1 - Task 46: DataViews schema expansion (✓ Complete)

`attachUIBindings()` now auto-registers DataViews from `resource.ui.admin.dataviews`, validating `mapQuery`, saved layouts, menu metadata, and view defaults. Controllers receive complete metadata, matching runtime contracts. Fixtures and schema docs updated accordingly.

### Patch 0.11.2 - Task 47: Async boundaries & notices (✓ Complete)

All DataViews routes render shared async boundaries (loading, empty, error, permission-denied). `useListResult()` normalizes fetch errors; `useDataViewActions()` dispatches WP notices and logs via reporters. Capability denials propagate through boundaries. Full test coverage across boundaries and action flows.

### Patch 0.11.3 - Task 48: Interactivity bridge (✓ Complete)

`createDataViewInteraction()` forwards DataView controller state (filters, sort, selection) into `defineInteraction`. Cache hydration uses pipeline-aware dispatch plumbing. Auto-registered controllers can opt in without duplication. Interactivity installation notes added to UI docs.

### Patch 0.11.4 - Task 49: Observability & hooks (✓ Complete)

Structured lifecycle events exposed: `registered`, `unregistered`, `viewChanged`, `actionTriggered`, `permissionDenied`, `fetchFailed`. Reporter channels expanded; optional `@wordpress/hooks` bridge added. Tests now assert emissions for all lifecycle stages.

### Patch 0.11.5 - Task 50: CLI DataView alignment (✓ Complete)

CLI emits DataViews registry metadata under `.generated/ui/registry/dataviews/*.ts` and persists view defaults, saved layouts, preferences keys, and menu metadata from config. Apply manifests track generated metadata for deletion. CLI now advertises UI handles when DataViews exist; the plugin loader registers/enqueues bundles accordingly.

### Patch 0.11.6 - Task 51: CLI interactivity scaffolds (✓ Complete)

Generators output `data-wp-*` bindings for interactivity and enqueue `wp.interactivity` when DataViews reference interactions. Interactivity diagnostics recorded through CLI reporters. Integration fixtures updated; E2E tests confirm correct bindings.

### Minor 0.12.0 - Task 52: Phase 8 minor release (✓ Complete)

All packages bumped to 0.12.0 with synchronized changelogs, regenerated API docs, refreshed fixtures, and validated end-to-end flows (`wpk generate && wpk apply --yes --dry-run`). Public docs now describe the complete DataViews baseline.
