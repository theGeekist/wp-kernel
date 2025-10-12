# WP Kernel CLI MVP Spec

**Status:** Draft specification synthesised from ongoing discussions.  
**Goal:** Deliver the smallest shippable “generate + apply” workflow that treats `KernelConfigV1` as the single source of truth for both runtime and tooling. The showcase app remains a reference example only; the spec must support every configuration permitted by `KernelConfigV1`.

---

## 1. Canonical Inputs

- **Configuration**: `kernel.config.ts` in the project root exporting a `KernelConfigV1` object. No alternative surfaces. All authoring guidance, linting, and CLI behaviour target this file.
- **Types**: Reuse definitions from `@geekist/wp-kernel/resource` (`ResourceConfig`, `ResourceStorageConfig`, etc.). The CLI must never introduce divergent shapes. For reference, see `packages/kernel/src/resource/types.ts` for the canonical runtime contract that inference is layered upon.
- **Schema Sources**: JSON Schemas may be local files, auto synthesised from storage metadata, or provided inline. Generated `.d.ts` files are convenience outputs and not authoritative.
- **Namespace**: Sanitised via `@geekist/wp-kernel/namespace`. The sanitised value is recorded in the IR and used for all PHP artefacts.

---

## 2. Loader & Validation Expectations

1. Locate `kernel.config.ts|js` or `package.json#wpk` via `cosmiconfig`.
2. Execute TypeScript configs through the existing `tsx` fallback.
3. Validate against `KernelConfigV1` using Typanion:
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
- `policies`: deduplicated list of policy identifiers referenced by routes.
- `blocks`: **NEW** – discovery result for block directories (SSR vs JS-only) based on `block.json` + optional `render.php`.
- `php`: defaults (`namespace`, `autoload`, `outputDir`) with room for adapter overrides.

Inference rules are derived from the canonical runtime types in `packages/kernel/src/resource/types.ts` and applied uniformly during IR construction:

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

Example generated fragment for a `wp-post` resource:

```php
$query = new WP_Query( $args );
$items = array();
foreach ( $query->posts as $post_item ) {
        $post_object = get_post( $post_item );
        if ( ! ( $post_object instanceof WP_Post ) ) {
                continue;
        }

        $items[] = $this->format_post_response( $post_object );
}

return rest_ensure_response( array(
        'items'      => $items,
        'total'      => (int) $query->found_posts,
        'hasMore'    => $query->max_num_pages > $page,
        'nextCursor' => $query->max_num_pages > $page ? (string) ( $page + 1 ) : null,
) );
```

Additional responsibilities:

- Build a `rest_api_init` bootstrap registering only the routes that require controllers.
- Use schema + query param metadata to populate `args` arrays, including validation derived from `ResourceQueryParams`.
- Wire `permission_callback` values derived from policy integration (section 5) and apply safe defaults with a warning when missing.
- Resolve identity parameters (`id`/`slug`/`uuid`) automatically when generating controller methods.
- Emit persistence registry containing identity/storage metadata (already scaffolded) and inferred post type when absent.

_Reference files_: `packages/cli/src/printers/php/printer.ts` and associated tests under `packages/cli/src/printers/__tests__/`.

### 4.4 Block Printers (New)

> **See:** [Block Inference Model](./BLOCK_INFERENCE_MODEL.md) for complete context on how blocks are derived from resources.

Add a dedicated printer that reads `ir.blocks` (populated from **both** inferred and discovered blocks):

_Reference scaffold_: block discovery feeds into printers via `packages/cli/src/ir/block-discovery.ts`; new emitters live under `packages/cli/src/printers/blocks/` with fixtures/tests in `packages/cli/tests/fixtures/blocks/**`.

#### Block Inference (Phase 3 - Core)

For each resource in `kernel.config.ts`:

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

## 5. Policy Integration

- Collect all `route.policy` strings in IR (`source: 'resource'`).
- Define a project-level policy map contract (e.g. `src/policy-map.ts` exporting `{ [key: string]: string | (args) => bool }` or JSON).
- During generation:
    - If map exists, emit a PHP helper (e.g. `inc/Policy/Policy.php`) that wraps capability checks, and wire controller `permission_callback` accordingly.
    - If absent, fallback to:
        - Configurable default (e.g. `__return_true`) with warning, or
        - `current_user_can( 'manage_options' )` warning authors to supply a map.
- Surface diagnostics when a route references a policy missing from the map.

---

## 6. Blocks of Authoring Safety

Leverage the repository’s existing flat-config setup (`eslint.config.js`) and in-house `@kernel` plugin housed under `eslint-rules/`. Extend that plugin with additional rules surfaced through `wpk init`:

- `wpk/config-consistency`: identity vs route parameter checks; warn on duplicate method/path combos; ensure `storage.wp-post` declares `postType`.
- `wpk/cache-keys-valid`: verify cache key functions return arrays of primitives and reference known query params.
- `wpk/policy-hints`: flag write routes without `policy`.
- `wpk/doc-links`: attach documentation URLs to diagnostics so lint output points authors back to the relevant guides.

These rules target kernel config authoring **within plugin projects generated by the CLI**. Fixtures used for testing should live under `packages/cli/tests` (or a similar in-package path); tests must not assume configs reside at the package root. Lint rules run on save and before the generate pipeline, preventing invalid configs from reaching printers. See `eslint-rules/` (rule sources), `eslint.config.js` (wiring), and future fixture suites under `packages/cli/tests/eslint/**`.

---

## 7. CLI Commands

### `wpk init <name>`

- Replace current stub with scaffolding:
    - Create `kernel.config.ts` template with inline documentation and lint-friendly hints.
    - Add `src/index.ts` that calls `configureKernel` using the config namespace.
    - Create `tsconfig.json` with `@kernel-config` alias pointing to the root file.
    - Configure ESLint + plugin, `.gitignore`, sample package scripts (`generate`, `apply`, `dev`), and Vite config (ESM by default, optional `--cjs`).
- Detect existing git repository; if missing, inform user (do not auto-init).
- Never overwrite existing files without explicit `--force`.

### `wpk generate`

- Existing pipeline remains: load config, build IR, evaluate adapters, run printers.
- Extend to populate new PHP behaviour and block outputs.
- Reporter summary: files written, unchanged, skipped; highlight warnings discovered during generation.

### `wpk apply`

- Already copies `.generated/php/**` into `inc/**` with fence protection.
- Extend safeguards:
    - Check git cleanliness unless `--yes`.
    - Optionally copy block artefacts (PHP manifest, JS bundles) into user directories.
    - Retain `.wpk-apply.log` audit trail.

### `wpk dev`

- Watch config, contracts, resource source files, and block directories.
- Debounce generate runs; optionally auto-apply JS artefacts while requiring confirmation for PHP unless `--auto-apply-php`.
- Ensure compositor handles adapter re-evaluation on every change.

Future wrappers (`wpk lint`, `wpk typecheck`) remain out of MVP scope.

---

## 8. Safety & Guardrails

- Composer PSR-4 mapping to `inc/` verified before generation completes.
- PHP namespace/class names must follow PSR-4; printer should enforce deterministic paths.
- CLI never deep-imports across packages; all runtime helpers come from published entry points.
- Generated PHP/TS files include `WPK:BEGIN/END AUTO` fences; `apply` refuses to overwrite edits outside fences unless `--force`.
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
- Encourage consumers to keep `kernel.config.ts` in sync with runtime by importing it directly inside `configureKernel` bootstrap.
- Showcase app may adopt generated artefacts for demonstration but must not be treated as canonical input.

---

## Appendix A – KernelConfig Template Sketch

```ts
import type { KernelConfigV1 } from '@geekist/wp-kernel-cli/config';

/**
 * Kernel Config v1
 * Docs: https://docs.wpk.dev/config/v1
 *
 * Lint rules flag common issues (identity/route mismatch, missing postType, etc.).
 */
export const kernelConfig: KernelConfigV1 = {
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
					policy: 'jobs.read',
				},
				get: {
					path: '/wpk/v1/jobs/:id',
					method: 'GET',
					policy: 'jobs.read',
				},
				create: {
					path: '/wpk/v1/jobs',
					method: 'POST',
					policy: 'jobs.create',
				},
				update: {
					path: '/wpk/v1/jobs/:id',
					method: 'PUT',
					policy: 'jobs.update',
				},
				remove: {
					path: '/wpk/v1/jobs/:id',
					method: 'DELETE',
					policy: 'jobs.delete',
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

This specification captures the minimal set of enhancements required to move from today’s partial implementation to an MVP that reliably generates server, UI, and block artefacts based purely on `KernelConfigV1`, without privileging the showcase example.
