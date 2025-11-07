# WP Kernel CLI MVP Spec

**Status:** Draft specification synthesised from ongoing discussions.  
**Goal:** Deliver the smallest shippable “generate + apply” workflow that treats `WPKernelConfigV1` as the single source of truth for both runtime and tooling. The showcase app remains a reference example only; the spec must support every configuration permitted by `WPKernelConfigV1`.

---

## 1. Canonical Inputs

- **Configuration**: `wpk.config.ts` in the project root exporting a `WPKernelConfigV1` object. No alternative surfaces. All authoring guidance, linting, and CLI behaviour target this file.
- **Types**: Reuse definitions from `@wpkernel/core/resource` (`ResourceConfig`, `ResourceStorageConfig`, etc.). The CLI must never introduce divergent shapes. For reference, see `packages/core/src/resource/types.ts` for the canonical runtime contract that inference is layered upon.
- **Schema Sources**: JSON Schemas may be local files, auto synthesised from storage metadata, or provided inline. Generated `.d.ts` files are convenience outputs and not authoritative.
- **Namespace**: Sanitised via `@wpkernel/core/contracts`. The sanitised value is recorded in the IR and used for all PHP artefacts.

---

## 2. Loader & Validation Expectations

1. Locate `wpk.config.ts|js` or `package.json#wpk` via `cosmiconfig`.
2. Execute TypeScript configs through the existing `tsx` fallback.
3. Validate against `WPKernelConfigV1` using Typanion:
    - `version` defaults to `1` with a warning when omitted; any other value throws.
    - `namespace` must sanitise successfully; warn when the sanitised form differs.
    - Each resource must provide at least one route operation.
    - Route paths must be relative, de-duplicated and free of disallowed prefixes.
    - Identity metadata must match at least one route parameter if provided.
    - Storage descriptors must match their declared modes (`wp-post`, `wp-taxonomy`, `wp-option`, `transient`).
4. Resolve schema entries:
    - Absolute or config-relative `path` must exist.
    - `generated.types` optionally overrides `.d.ts` destinations.
    - `description` is recorded in the IR for future documentation.
5. Evaluate cache key functions, freezing the result or falling back to deterministic defaults.
6. Perform Composer autoload sanity check (PSR-4 mapping to `inc/`).

Loader output remains `{ config, sourcePath, configOrigin, namespace, composerCheck }`.

---

## 3. Intermediate Representation (IR)

Enhance the current IR builder to capture everything required for generation:

- `meta`: namespace (raw + sanitised), source path, origin, version.
- `schemas`: manual or auto-synthesised entries with hashes.
- `resources`: per-resource record containing:
    - routes (normalised, hashed, `transport` hint identifying local vs remote),
    - cache keys (config vs inferred defaults),
    - identity (explicit or inferred), storage, query params, UI metadata,
    - schema provenance (`manual` vs `auto`).
- `capabilities`: deduplicated list of capability identifiers referenced by routes.
- `blocks`: **NEW** - discovery result for block directories (SSR vs JS-only) based on `block.json` + optional `render.php`.
- `php`: defaults (`namespace`, `autoload`, `outputDir`) with room for adapter overrides.

Inference rules are derived from the canonical runtime types in `packages/core/src/resource/types.ts` and applied uniformly during IR construction:

- Identity defaults (`id`/`slug`/`uuid`) are inferred from route placeholders when authors omit `resource.identity`.
- `schema` falls back to `'auto'` whenever storage metadata is present and no explicit schema is supplied.
- Cache keys mirror the runtime defaults when `resource.cacheKeys` is missing so printers can remain deterministic.
- `wp-post` storage gains a derived `postType` (sanitised namespace + resource name) unless authors provide their own.
- Route paths are classified as local vs remote to determine whether PHP controllers should be generated.

_Reference files_: `packages/cli/src/ir/build-ir.ts`, helpers in `packages/cli/src/ir/routes.ts` + `packages/cli/src/ir/block-discovery.ts`, and corresponding Jest suites under `packages/cli/src/ir/__tests__`.

IR must remain purely data-printers decide how to act.

---

## 4. Printers

### 4.1 Type Printer

Already implemented. Continue emitting `.generated/types/*.d.ts` plus an index that re-exports every schema type. Honour `generated.types` overrides.

### 4.2 UI Printer

Already implemented for DataViews:

- When `resource.ui.admin.dataviews` exists, emit:
    - React admin screen wrapper (component + optional route export),
    - Serialized DataView config fixtures,
    - Menu registration PHP shim when `screen.menu` present.
- Functions are stringified; document that they must be pure.

### 4.3 PHP Printer (Delta)

Replace current skeleton emission with behaviour driven entirely by the IR:

| Scenario recognised from config                   | Expected output                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Local routes + `storage: 'wp-post'`               | Full CRUD controller using core post APIs, schema-driven REST args, meta/taxonomy registration hints. |
| Local routes + `storage: 'wp-taxonomy'`           | CRUD covering terms with taxonomy metadata.                                                           |
| Local routes + `storage: 'wp-option'`             | Option CRUD wrappers.                                                                                 |
| Local routes + `storage: 'transient'`             | Transient CRUD wrappers.                                                                              |
| Local routes + no storage                         | Stub methods returning `WP_Error( 501, 'Not Implemented' )` with TODO comment.                        |
| Routes pointing outside namespace / absolute URLs | Skip PHP emission for those routes (client-only).                                                     |

Additional responsibilities:

- Build a `rest_api_init` bootstrap registering only the routes that require controllers.
- Use schema + query param metadata to populate `args` arrays, including validation derived from `ResourceQueryParams`.
- Wire `permission_callback` values derived from capability integration (section 5) and apply safe defaults with a warning when missing.
- Resolve identity parameters (`id`/`slug`/`uuid`) automatically when generating controller methods.
- Emit persistence registry containing identity/storage metadata (already scaffolded) and inferred post type when absent.

_Reference files_: `packages/cli/src/printers/php/printer.ts` and associated tests under `packages/cli/src/printers/__tests__/`.

### 4.4 Block Printers (New)

> **See:** [Block Inference Model](./BLOCK_INFERENCE_MODEL.md) for complete context on how blocks are derived from resources.

Add a dedicated printer that reads `ir.blocks` (populated from **both** inferred and discovered blocks):

_Reference scaffold_: block discovery feeds into printers via `packages/cli/src/ir/block-discovery.ts`; new emitters live under `packages/cli/src/printers/blocks/` with fixtures/tests in `packages/cli/tests/fixtures/blocks/**`.

#### Block Inference (Phase 3 - Core)

For each resource in `wpk.config.ts`:

- **Infer block existence** from UI config, public routes, or storage
- **Determine block type** (SSR vs JS-only) from storage + route locality
- **Generate `block.json`** with metadata derived from resource schema, identity, and display config
    - Generated files validated against WordPress's canonical `block.json` schema ([`block.schema.json`](./block.schema.json))
    - Schema defines **what fields are valid**; inference logic determines **which values to generate** (see [Block Inference Model](./BLOCK_INFERENCE_MODEL.md))
- **Scaffold edit components** (`src/blocks/<name>/index.tsx`) if they don't exist
- **Scaffold SSR render** (`src/blocks/<name>/render.php`) for SSR blocks if not present
- **Respect manual overrides** - if `block.json` already exists (discovered in Phase 1B), use it instead of generating

#### Block Registration Output

- **SSR blocks** (inferred or discovered with `"render"` or `render.php` file):
    - Generate `build/blocks-manifest.php` mapping block folders to registration metadata.
    - Generate `inc/Blocks/Register.php` (or similar) that reads the manifest and calls `register_block_type`.
- **JS-only blocks** (inferred or discovered):
    - Generate `src/blocks/auto-register.ts` exporting a module that calls `registerBlockType` for each block.

**Key principle**: Blocks are **inferred from resources first**, then **discovery (Phase 1B) identifies manual overrides**. This eliminates the need for `@wordpress/create-block` entirely.

---

## 5. Capability Integration

- Collect all `route.capability` strings in IR (`source: 'resource'`).
- Define a project-level capability map contract (e.g. `src/capability-map.ts` exporting `{ [key: string]: string | (args) => bool }` or JSON).
- During generation:
    - If map exists, emit a PHP helper (e.g. `inc/Capability/Capability.php`) that wraps capability checks, and wire controller `permission_callback` accordingly.
    - If absent, fallback to:
        - Configurable default (e.g. `__return_true`) with warning, or
        - `current_user_can( 'manage_options' )` warning authors to supply a map.
- Surface diagnostics when a route references a capability missing from the map.

---

## 6. Blocks of Authoring Safety

Leverage the repository’s existing flat-config setup (`eslint.config.js`) and in-house `@kernel` plugin housed under `eslint-rules/`. Extend that plugin with additional rules surfaced through `wpk init`:

- `wpk/config-consistency`: identity vs route parameter checks; warn on duplicate method/path combos; ensure `storage.wp-post` declares `postType`.
- `wpk/cache-keys-valid`: verify cache key functions return arrays of primitives and reference known query params.
- `wpk/capability-hints`: flag write routes without `capability`.
- `wpk/doc-links`: attach documentation URLs to diagnostics so lint output points authors back to the relevant guides.

These rules target wpk config authoring **within plugin projects generated by the CLI**. Fixtures used for testing should live under `packages/cli/tests` (or a similar in-package path); tests must not assume configs reside at the package root. Lint rules run on save and before the generate pipeline, preventing invalid configs from reaching printers. See existing rule sources under `eslint-rules/`, integration wiring in `eslint.config.js`, and rule fixtures in `packages/cli/tests/eslint/**`.

---

## 7. CLI Commands

### `wpk generate`

- Reads `wpk.config.ts`, builds IR, and writes all artifacts to `.generated/**` (types, PHP controllers/index, block outputs, DataViews fixtures).
- Never touches `inc/` or `build/` directly.
- Flags: `--dry-run` (report only) and `--verbose` (detailed reporter output).

### `wpk apply`

- Copies `.generated/php/**` → `inc/**` (inside `WPK:BEGIN/END AUTO` blocks only).
- Copies `.generated/build/**` (e.g., block manifests) into `build/**`.
- Enforces clean git unless `--yes`; optional `--backup` and `--force` flags mirror current behaviour; emits `.wpk-apply.log` entries.

### `wpk start`

- Watches `wpk.config.ts`, `contracts/**`, resource sources, and block directories.
- Re-runs `wpk generate` on change (no automatic `apply`).
- Boots the Vite dev server so JS/TS assets hot-reload; surface logger output within the CLI reporter.
- Optional `--auto-apply-php` flag keeps parity with the existing `dev` implementation (defaults to manual apply).

### `wpk build`

- Convenience pipeline that produces a runnable plugin in one shot.
    1. Run `wpk generate` (fails fast on validation errors).
    2. Execute the workspace Vite production build (generates JS/CSS into `build/`).
    3. Run `wpk apply --yes` to push generated PHP + block manifest into `inc/`/`build/`.
- Supports `--no-apply` for scenarios where authors want to inspect `.generated/**` + Vite output without altering `inc/`.
- Intended for CI or local production builds; logs a concise summary of each step via the reporter.

Future wrappers (`wpk lint`, `wpk typecheck`) remain out of scope for MVP.

**Suggested package scripts**

```json
{
	"scripts": {
		"start": "wpk start",
		"build": "wpk build",
		"generate": "wpk generate",
		"apply": "wpk apply"
	}
}
```

---

## 8. Safety & Guardrails

- Composer PSR-4 mapping to `inc/` verified before generation completes.
- PHP namespace/class names must follow PSR-4; printer should enforce deterministic paths.
- CLI never deep-imports across packages; all runtime helpers come from published entry points.
- Generated PHP/TS files include `WPK:BEGIN/END AUTO` fences; `apply` refuses to overwrite edits outside fences unless `--force`.

---

## 9. Out-of-Scope / Deferred Enhancements

- **Capability helper PHP file**: Dedicated helper generation is planned for Phase 7 alongside the capability-map contract.
- **UI/DataViews scaffolding**: Present in the showcase but not part of the core CLI MVP roadmap; future phases may broaden coverage.
- **Resource-driven block scaffolding flags**: Optional features such as `resource.blocks?.scaffold` remain future work; current MVP focuses on discovery + derivation.

---

## 10. Integration Harness & Testing Strategy (Phase 6A)

Objective: provide first-class CLI integration tests that exercise command pipelines against disposable plugin workspaces, without requiring browser automation.

### Tooling additions

- Add an integration harness to `packages/e2e-utils/` (e.g., `createCliWorkspace`) that can:
    - Materialise a temporary plugin workspace from fixtures (copy under `/tests/fixtures/**`).
    - Run CLI commands (`wpk generate`, `apply`, `start`, `build`) via `execa`/`child_process` with consistent logging.
    - Expose helpers to inspect resulting filesystem trees, `.wpk-apply.log`, and command stdout/stderr.
- Provide fixture templates under `packages/cli/tests/integration/fixtures/**` covering canonical cases (empty plugin, block-heavy plugin, storage-mode plugin).

### Integration test scope

- Create a Jest suite under `packages/cli/tests/integration/cli-smoke.test.ts` (or similar) that orchestrates end-to-end flows:
    1. `wpk generate` → assert `.generated/**` contents match expectations (types, PHP, blocks, UI).
    2. `wpk apply` → verify `inc/**`, `build/**`, and `.wpk-apply.log` updates; confirm fences honoured.
    3. `wpk build` → ensure pipeline runs (generate → Vite build → apply) with `--no-apply` and default variants.
    4. Optional: `wpk start` smoke (ensure watcher spins up; this may use a lightweight stub for Vite during tests).
- Tests should reset workspaces per case and produce reproducible snapshots/hashes to keep assertion burden low.

### Deliverables

- Integration harness utilities in `packages/e2e-utils/src/cli-workspace.ts` (or similar).
- Integration test fixtures under `packages/cli/tests/integration/fixtures/**`.
- CLI integration Jest suite under `packages/cli/tests/integration/**`.
- Documentation updates referencing the new harness (README / contributing guide).

### Success criteria

- Running `pnpm --filter @wpkernel/cli test --runInBand integration` executes the smoke suite reliably.
- Harness utilities are reusable by future browser-based e2e (optional) without coupling to Playwright.
- Provides confidence between unit tests and full browser e2e by validating CLI behaviour against real workspaces.

---

## 11. Documentation, Exports & Bundler Hygiene (Phase 8A)

### Goals

- Deliver consistent API documentation across kernel/CLI/UI packages.
- Normalise module exports to eliminate deep imports and unlock bundler tree-shaking.
- Externalise unnecessary dependencies from the CLI bundle.

### Tasks

1. **Documentation alignment**
    - Ensure `packages/core` continues to emit API docs from existing JSDoc (no ad-hoc Markdown copies).
    - Expand JSDoc coverage for public CLI/UI exports; regenerate docs via the existing tooling (or enhance scripts under `docs/`).
    - Update contributing docs to describe how to regenerate API references.
2. **Export hygiene**
    - Introduce `index.ts` re-export barrels for wpk subdirectories (e.g., `packages/core/src/events/index.ts`) so every public module has a stable entry point.
    - Update each package’s `package.json` `exports` map with those subpaths (e.g., `@wpkernel/core/events`).
    - Replace consumer imports that either hit the package root (`@wpkernel/core`) or deep relative paths (`../../src/...`) with the new subpath exports.
    - Add lint/tests preventing future use of root/deep relative imports in favour of the explicit subpaths.
3. **Bundler externals**
    - Review CLI build output; externalise libraries such as `@wordpress/*`, `chokidar`, etc., where runtime expects them as peer deps.
    - Lazy-load expensive dependencies when appropriate and document any breaking changes.
    - Capture before/after bundle stats to demonstrate improvements.

### Deliverables

- Updated source modules with new `index.ts` barrels.
- Revised documentation generation scripts and Published API references.
- Updated bundler/vite config(s) showing explicit externals.
- Tests or CI checks ensuring new import paths and doc generation succeed (`pnpm build`, `pnpm test`).

### Success Criteria

- Builds/imports rely solely on exposed package exports (no ESLint complaints about deep imports).
- Generated API docs cover kernel/CLI/UI consistently.
- CLI bundle excludes the externalised libraries, confirmed by build logs or size reports.
- Adapters operate inside sandboxed directories with commit/rollback semantics (already implemented).

---

## 9. Testing Strategy

- **Unit tests**: loader, validator, IR builder, new PHP printer logic, block printer.
- **Golden fixtures**: maintain snapshots for representative configs (no reliance on showcase).
- **Integration tests**: temporary workspace per command pipeline (`generate` + `apply` round-trip).
- **Lint rule tests**: ESLint `RuleTester` covering positive/negative cases.
- Use existing Jest configuration (`packages/cli/jest.config.js`).

---

## 10. Adoption Notes

- Update CLI README with root-config instructions (no showcase references beyond illustrative snippets).
- Encourage consumers to keep `wpk.config.ts` in sync with runtime by importing it directly inside `configureWPKernel` bootstrap.
- Showcase app may adopt generated artefacts for demonstration but must not be treated as canonical input.

---

## Appendix A - WPKernelConfig Template Sketch

```ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

/**
 * Kernel Config v1
 * Docs: https://docs.wpk.dev/config/v1
 *
 * Lint rules flag common issues (identity/route mismatch, missing postType, etc.).
 */
export const wpkConfig: WPKernelConfigV1 = {
	namespace: 'my-plugin',
	version: 1,
	schemas: {
		job: {
			path: './contracts/job.schema.json',
			generated: { types: './.generated/types/job.d.ts' },
			// description: optional metadata for future docs.
		},
	},
	resources: {
		job: {
			name: 'job',
			identity: { type: 'number', param: 'id' },
			storage: {
				mode: 'wp-post',
				postType: 'wpk_job',
				meta: {
					department: { type: 'string', single: true },
					location: { type: 'string', single: true },
				},
			},
			schema: 'auto',
			routes: {
				list: {
					path: '/wpk/v1/jobs',
					method: 'GET',
					capability: 'jobs.read',
				},
				get: {
					path: '/wpk/v1/jobs/:id',
					method: 'GET',
					capability: 'jobs.read',
				},
				create: {
					path: '/wpk/v1/jobs',
					method: 'POST',
					capability: 'jobs.create',
				},
				update: {
					path: '/wpk/v1/jobs/:id',
					method: 'PUT',
					capability: 'jobs.update',
				},
				remove: {
					path: '/wpk/v1/jobs/:id',
					method: 'DELETE',
					capability: 'jobs.delete',
				},
			},
			cacheKeys: {
				list: (params) => ['job', 'list', params?.q ?? null],
				get: (id) => ['job', 'get', id ?? null],
			},
			queryParams: {
				q: { type: 'string', optional: true },
			},
			ui: {
				admin: {
					dataviews: {
						fields: [
							{
								id: 'title',
								label: 'Title',
								enableSorting: true,
							},
						],
						defaultView: {
							type: 'table',
							fields: ['title'],
							page: 1,
							perPage: 10,
						},
						mapQuery: (state) => ({
							q: state.search?.trim() || undefined,
						}),
						search: true,
					},
				},
			},
		},
	},
	// adapters?: { php?: () => ({ namespace, autoload, customise }), extensions?: [] }
};
```

---

This specification captures the minimal set of enhancements required to move from today’s partial implementation to an MVP that reliably generates server, UI, and block artefacts based purely on `WPKernelConfigV1`, without privileging the showcase example.
