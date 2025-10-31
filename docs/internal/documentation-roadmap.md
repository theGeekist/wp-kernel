# Documentation Upgrade Roadmap

This roadmap coordinates the multi-phase uplift of the WP Kernel documentation set. It expands the original outline into scoped Docs Phases and Docs Tasks so contributors can plan, staff, and verify work in a predictable order.

## Coordination & guardrails

- **Single source of truth:** This file owns the sequence and scope for every documentation push. Update it first, then reflect the changes in task-specific specs.
- **Docs surface vs. internal notes:** Pages inside `docs/internal/` are hidden from the public build through `srcExclude` in `docs/.vitepress/config.ts`. Use the internal area for planning artefacts only.
- **Content workflow:** When a Docs Task touches executable snippets, run `pnpm lint --fix`, `pnpm typecheck`, and any relevant package-level doc tests before shipping the change.
- **Cross-file references:** Keep navigation indices (`docs/index.md`, `docs/packages/index.md`, contributing guides, etc.) aligned with new or renamed content to avoid orphaned pages.
- **API docs discipline:** All phases rely on authors annotating exports with accurate JSDoc (including `@category` groupings) so the Typedoc output remains navigable.

## Docs phase ledger

| Docs Phase                                            | Status     | Summary                                                                                          | Ledger                                                                  |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Docs Phase 1 – Foundational Restructuring and Tooling | ✓ Complete | Locked the planning surface, restructured navigation, and adopted the baseline API doc strategy. | [Jump](#docs-phase-1--foundational-restructuring-and-tooling--complete) |
| Docs Phase 2 – `@wpkernel/core` Gold Standard         | ⬜ Planned | Establishes the reference quality bar across core guides, README, and API docs.                  | [Jump](#docs-phase-2--wpkernelcore-gold-standard--planned)              |
| Docs Phase 3 – Package Rollout                        | ⬜ Planned | Applies the Phase 2 playbook to each remaining package, grouped by dependency surface.           | [Jump](#docs-phase-3--package-rollout--planned)                         |

---

### Docs Phase 1 – Foundational Restructuring and Tooling (✓ Complete)

The foundational phase created the scaffolding required to scale the documentation push. All Docs Tasks under this phase have shipped and the resulting assets are live in `main`.

#### Docs Task 1 – Establish the roadmap (✓ Complete)

- [x] Draft the initial roadmap that sequences documentation work across packages (`docs/internal/documentation-roadmap.md`).
- [x] Confirm the internal planning directory is excluded from the public build via `srcExclude: ['internal/*.md']` in `docs/.vitepress/config.ts`.
- [x] Circulate the roadmap by linking it from relevant planning surfaces (e.g., referenced in root `AGENTS.md`).

#### Docs Task 2 – Restructure navigation for packages (✓ Complete)

- [x] Add a dedicated “Packages” item to the global navigation and sidebar inside `docs/.vitepress/config.ts`.
- [x] Seed package landing pages in `docs/packages/*.md`, including `docs/packages/index.md` for the overview and per-package stubs.
- [x] Ensure navigation breadcrumbs point to the package hub from guides and examples that mention specific workspaces.

#### Docs Task 3 – Baseline API documentation strategy (✓ Complete)

- [x] Audit the Typedoc build output and adopt grouping-friendly defaults in `typedoc.json` (`categorizeByGroup`, `kindSortOrder`, `sort`).
- [x] Disable noisy metadata and private surfaces in the Typedoc configuration (`excludePrivate`, `excludeInternal`, `disableSources`) so the generated Markdown mirrors the public API.
- [x] Document the expectation that maintainers provide `@category` tags and focused examples alongside exported symbols so future phases can lean on meaningful grouping.

#### Docs Task 4 – Contributor guidance touchpoints (✓ Complete)

- [x] Update the root planning docs to reference this roadmap (`AGENTS.md`, CLI MVP plan cross-links) so contributors discover it before picking up doc-adjacent work.
- [x] Note the dependency in package-level planning documents where relevant (for example, CLI migration specs now call out documentation coordination).
- [x] Record follow-up actions inside each future Docs Phase so package owners know when their guidance must be synchronized.

---

### Docs Phase 2 – `@wpkernel/core` Gold Standard (⬜ Planned)

The second phase applies the documentation playbook to `@wpkernel/core`, producing a reference package that illustrates the desired quality bar.

#### Docs Task 5 – JSDoc audit for exported core APIs (✓ Complete)

- [x] Inventory all exports from `packages/core/src/index.ts` and supporting modules to create a tracking checklist.
- [x] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [x] Add runnable `@example` snippets where practical and verify them through the core test suite or embedded playground harnesses.

##### Docs Task 5 artifact – Core export checklist

| Category      | Symbols                                                                                                                                                                                                                                           | Notes                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Metadata      | `VERSION`, `getWPData`                                                                                                                                                                                                                            | Constants remain unchanged and continue to re-export the global runtime version and WordPress data accessor. |
| HTTP          | `fetch`                                                                                                                                                                                                                                           | Transport helper now documents correlation, reporters, and examples with `@category HTTP`.                   |
| Resource      | `defineResource`, `createStore`, `normalizeCacheKey`, `matchesCacheKey`, `findMatchingKeys`, `findMatchingKeysMultiple`, `interpolatePath`, `extractPathParams`, `invalidate`, `invalidateAll`                                                    | Added detailed JSDoc with examples and `@category Resource` tags across cache and store helpers.             |
| Actions       | `defineAction`, `createActionMiddleware`, `invokeAction`, `EXECUTE_ACTION_TYPE`                                                                                                                                                                   | Added `@category Actions` metadata and clarified middleware workflow in examples.                            |
| Capability    | `defineCapability`, `createCapabilityProxy`                                                                                                                                                                                                       | Added contributor-facing examples and `@category Capability`.                                                |
| Data          | `configureWPKernel`, `registerWPKernelStore`, `wpkEventsPlugin`                                                                                                                                                                                   | Documented runtime configuration patterns with runnable snippets under `@category Data`.                     |
| Interactivity | `defineInteraction`                                                                                                                                                                                                                               | Expanded description and categorised under `Interactivity`.                                                  |
| Events        | `WPKernelEventBus`, `getWPKernelEventBus`, `setWPKernelEventBus`, `recordResourceDefined`, `removeResourceDefined`, `recordActionDefined`, `getRegisteredResources`, `getRegisteredActions`, `clearRegisteredResources`, `clearRegisteredActions` | Documented shared bus lifecycle with `@category Events` annotations.                                         |
| Reporter      | `createReporter`, `createNoopReporter`, `getWPKernelReporter`, `setWPKernelReporter`, `clearWPKReporter`                                                                                                                                          | Added guidance on LogLayer usage with `@category Reporter`.                                                  |
| Namespace     | `resetNamespaceCache`, `sanitizeNamespace`, `detectNamespace`, `getNamespace`, `isValidNamespace`                                                                                                                                                 | Added sanitisation workflow detail and `@category Namespace`.                                                |

#### Docs Task 6 – Author segmented guides for core (✓ Complete)

- [x] Draft a plugin developer guide covering installation, configuration, and integration touchpoints under `docs/packages/core/plugin-developers.md` (new).
- [x] Draft a framework contributor guide that explains extension points, lifecycle hooks, and diagnostics under `docs/packages/core/framework-contributors.md` (new).
- [x] Update `docs/packages/index.md` and any guide landing pages to surface both guides with clear audience labeling.

#### Docs Task 7 – Refresh `packages/core/README.md` (⬜ Planned)

- [ ] Reorganize the README into overview, quick links, and contribution guidance sections, pointing to the new guides and API reference.
- [ ] Replace legacy implementation details with references to the pipeline specs to avoid duplication.
- [ ] Validate that badges, build instructions, and package metadata (e.g., npm scope) are current.

#### Docs Task 8 – Apply the API doc strategy to core (⬜ Planned)

- [ ] Tag all relevant exports with `@category` values that map cleanly to end-user concepts before regenerating Typedoc output.
- [ ] Configure Typedoc category ordering (via `typedoc.json` `categorizeByGroup` / frontmatter) so core symbols render in a predictable order.
- [ ] Publish the refreshed Markdown under `docs/api/@wpkernel/core/` and update any references in guide pages.

---

### Docs Phase 3 – Package Rollout (⬜ Planned)

Subsequent packages follow the Phase 2 blueprint. Tasks are grouped by dependency clusters so shared primitives evolve together.

#### Docs Task 9 – Elevate `@wpkernel/ui` documentation (⬜ Planned)

- [ ] Perform a JSDoc sweep for UI exports in `packages/ui/src/**`, ensuring interactivity helpers include usage guidance and `@category` tags.
- [ ] Author user-facing docs under `docs/packages/ui/` that cover binding widgets, admin integration, and styling hooks.
- [ ] Align `packages/ui/README.md` with the new guides and regenerate API docs scoped to UI.

#### Docs Task 10 – Elevate `@wpkernel/cli` documentation (⬜ Planned)

- [ ] Update CLI JSDoc (especially under `packages/cli/src/next/**`) so commands and pipelines surface consistent categories and examples.
- [ ] Expand `docs/packages/cli.md` into a multi-section guide covering workflows (`create`, `init`, `generate`, `apply`) and link into existing migration specs.
- [ ] Rework `packages/cli/README.md` to act as the CLI hub, delegating deep dives to guides and API references.

#### Docs Task 11 – Document `@wpkernel/test-utils` (⬜ Planned)

- [ ] Document all exported helpers in `packages/test-utils/src/**` with precise JSDoc, especially around fixtures and harness contracts.
- [ ] Create a testing cookbook under `docs/packages/test-utils.md` illustrating integration with Jest, Playwright, and wp-env.
- [ ] Ensure the README highlights package scope, setup requirements, and links to CLI/UI examples that consume the helpers.

#### Docs Task 12 – Document `@wpkernel/e2e-utils` (⬜ Planned)

- [ ] Audit Playwright helpers and environment bootstrapping code for missing JSDoc coverage.
- [ ] Write an end-to-end testing guide (new file under `docs/packages/e2e-utils.md` or a subpage) explaining workflow configuration and telemetry expectations.
- [ ] Update the README with smoke test instructions and cross-links to the documentation roadmap for coordinated releases.

#### Docs Task 13 – PHP transport packages (`php-driver`, `php-json-ast`, `wp-json-ast`) (⬜ Planned)

- [ ] For each package, catalogue public functions/classes and add docblocks that mirror the TypeScript-side behaviour.
- [ ] Produce language-appropriate guides under `docs/packages/php-driver.md`, `docs/packages/php-json-ast.md`, and `docs/packages/wp-json-ast.md` with setup requirements and interoperability notes.
- [ ] Harmonize README files so they point to the shared architecture narrative and enumerate compatibility guarantees.

#### Docs Task 14 – Document `@wpkernel/create-wpk` (⬜ Planned)

- [ ] Finalize the workspace bootstrap README with installation, flag reference, and telemetry overview.
- [ ] Author a quick-start guide under `docs/packages/create-wpk.md` that demonstrates the full scaffold-to-activation flow.
- [ ] Update CLI docs to reference the bootstrap package wherever we describe new project workflows, keeping the messaging consistent.

---

Future Docs Phases (such as maintenance sweeps or localization) will be appended here once the package rollout stabilizes and new priorities emerge.
