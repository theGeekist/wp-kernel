# Decision matrix

This page explains what the CLI generates when you run `wpk generate` or `wpk apply`. It mirrors the internal matrix described in `cli-decision-matrix.md` at the repository root and the printers under `packages/cli/src/printers`. No differences were found during the latest review.【F:packages/cli/src/printers/index.ts†L1-L16】

## Types printer

- **Inputs** - every schema in the normalised IR.
- **Outputs** - `.generated/types/*.d.ts` plus an index that re-exports PascalCase names.
- **Notes** - emits a content hash comment so `wpk apply` can skip unchanged files.【F:packages/cli/src/printers/types/printer.ts†L1-L120】

## PHP printer

| Condition                                                            | Controller body                                     | Bootstrap | Notes                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| Local routes with `storage.mode === 'wp-post'`                       | Full CRUD implementation using WordPress primitives | Yes       | Generates REST argument maps and honours resource identity (`id`, `slug`, or `uuid`). |
| Local routes with storage in `{ wp-taxonomy, wp-option, transient }` | Storage-specific implementation or `WP_Error(501)`  | Yes       | Provides helpers tailored to the storage mode.                                        |
| Local routes without storage                                         | Stubs returning `WP_Error(501, 'Not Implemented')`  | Yes       | Scaffolds the class so teams can fill it in later.                                    |
| Only remote routes or none                                           | Skips resource entirely                             | No        | Pure client-side resources do not generate PHP.                                       |

Additional outputs:

- `.generated/php/Rest/BaseController.php`
- `.generated/php/Rest/<Resource>Controller.php`
- `.generated/php/Policy/Policy.php`
- `.generated/php/Registration/PersistenceRegistry.php`
- `.generated/php/index.php`

The printer enforces public visibility for REST controller overrides and warns when policy hints are missing on write routes.【F:packages/cli/src/printers/php/printer.ts†L1-L73】【F:packages/cli/src/printers/php/routes.ts†L60-L170】

## Blocks printer

- **JS-only blocks** - emits `.generated/blocks/auto-register.ts` that imports discovered `block.json` files and registers them automatically.【F:packages/cli/src/printers/blocks/js-only.ts†L1-L120】
- **SSR blocks** - generates PHP registrars under `.generated/php/Blocks/**` and warns if closures cannot be serialised.【F:packages/cli/src/printers/blocks/ssr.ts†L1-L160】

## UI printer (DataViews)

When a resource defines `ui.admin.dataviews` the CLI emits:

- `.generated/ui/app/<resource>/admin/<Component>.tsx` - wrapper around the DataViews runtime.
- `.generated/ui/fixtures/dataviews/<resource>.ts` - serialised metadata.
- `.generated/php/Admin/Menu_<Component>.php` - admin menu shim that enqueues the built bundle.【F:packages/cli/src/printers/ui/printer.ts†L1-L120】

Function serialisation detects captured variables and warns when a function is not pure.

## Printers deliberately skip

- Running Vite or building assets.
- Copying files into `inc/` or `build/` (handled by `wpk apply`).
- Creating the initial project structure (handled by `wpk init`).

## Troubleshooting checklist

- Missing policy hints on write routes → warning with `manage_options` fallback.【F:packages/cli/src/printers/php/routes.ts†L80-L170】
- UUID identity without a matching meta key → warning and stubbed `get` implementation.【F:packages/cli/src/printers/php/resource-controller.ts†L1-L70】
- PHP visibility mismatch → build error when formatting the file.【F:packages/cli/src/printers/php/printer.ts†L1-L73】
- Detected closures in DataViews functions → warning to refactor into pure functions.【F:packages/cli/src/printers/ui/printer.ts†L1-L120】
