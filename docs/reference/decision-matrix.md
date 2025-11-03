# Decision matrix

This page explains what the CLI generates when you run `wpk generate` or `wpk apply`. It mirrors the internal matrix described in `cli-decision-matrix.md` at the repository root and the builders under `packages/cli/src/builders`. No differences were found during the latest review.【F:packages/cli/src/builders/php/printers.ts†L1-L40】

## Types builder

- **Inputs** - every schema in the normalised IR.
- **Outputs** - `.generated/types/*.d.ts` plus an index that re-exports PascalCase names.
- **Notes** - emits a content hash comment so `wpk apply` can skip unchanged files.【F:packages/cli/src/builders/ts.ts†L1-L200】

## PHP builder

| Condition                                                            | Controller body                                     | Bootstrap | Notes                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| Local routes with `storage.mode === 'wp-post'`                       | Full CRUD implementation using WordPress primitives | Yes       | Generates REST argument maps and honours resource identity (`id`, `slug`, or `uuid`). |
| Local routes with storage in `{ wp-taxonomy, wp-option, transient }` | Storage-specific implementation or `WP_Error(501)`  | Yes       | Provides helpers tailored to the storage mode.                                        |
| Local routes without storage                                         | Stubs returning `WP_Error(501, 'Not Implemented')`  | Yes       | Scaffolds the class so teams can fill it in later.                                    |
| Only remote routes or none                                           | Skips resource entirely                             | No        | Pure client-side resources do not generate PHP.                                       |

Additional outputs:

- `.generated/php/Rest/BaseController.php`
- `.generated/php/Rest/<Resource>Controller.php`
- `.generated/php/Capability/Capability.php`
- `.generated/php/Registration/PersistenceRegistry.php`
- `.generated/php/index.php`

The builders enforce public visibility for REST controller overrides and warn when capability hints are missing on write routes.【F:packages/cli/src/builders/php/resourceController.ts†L1-L220】【F:packages/cli/src/builders/php/routes.ts†L60-L220】

## Blocks builders

- **JS-only blocks** - emits `.generated/blocks/auto-register.ts` that imports discovered `block.json` files and registers them automatically.【F:packages/cli/src/builders/ts.ts†L200-L360】
- **SSR blocks** - generates PHP registrars under `.generated/php/Blocks/**` and warns if closures cannot be serialised.【F:packages/cli/src/builders/php/blocks/index.ts†L1-L160】

## UI builder (DataViews)

When a resource defines `ui.admin.dataviews` the CLI emits:

- `.generated/ui/app/<resource>/admin/<Component>.tsx` - wrapper around the DataViews runtime.
- `.generated/ui/fixtures/dataviews/<resource>.ts` - serialised metadata.
- `.generated/php/Admin/Menu_<Component>.php` - admin menu shim that enqueues the built bundle.【F:packages/cli/src/builders/ts.ts†L120-L220】

Function serialisation detects captured variables and warns when a function is not pure.

## Builders deliberately skip

- Running Vite or building assets.
- Copying files into `inc/` or `build/` (handled by `wpk apply`).
- Creating the initial project structure (handled by `wpk init`).

## Troubleshooting checklist

- Missing capability hints on write routes → warning with `manage_options` fallback.【F:packages/cli/src/builders/php/routes.ts†L170-L260】
- UUID identity without a matching meta key → warning and stubbed `get` implementation.【F:packages/cli/src/builders/php/resourceController.ts†L200-L320】
- PHP visibility mismatch → build error when formatting the file.【F:packages/cli/src/builders/php/resourceController.ts†L1-L120】
- Detected closures in DataViews functions → warning to refactor into pure functions.【F:packages/cli/src/builders/ts.ts†L200-L360】
