# WP Kernel CLI Specification

> **Scope**: End-to-end tooling that consumes `kernel.config.ts`, generates deterministic artifacts, and applies them to a WordPress plugin workspace. This document governs implementation details referenced by the roadmap in [`PHASES.md`](./PHASES.md).

## 1. Source of Truth & Runtime Parity

- **Config contract** – The CLI must consume the same configuration used at runtime. Current example: [`app/showcase/src/kernel.config.ts`](../../app/showcase/src/kernel.config.ts) with namespace, schema map, and resource definitions.
- **Runtime expectations** – Generated artifacts must remain compatible with the kernel APIs defined in [`packages/kernel/src/data/configure-kernel.ts`](../kernel/src/data/configure-kernel.ts) and downstream helpers (actions, resources, policy).
- **Schema inputs** – JSON Schemas located under `contracts/` (e.g. [`app/showcase/contracts/job.schema.json`](../../app/showcase/contracts/job.schema.json)) remain canonical. Generated `.d.ts` files are convenience outputs and must not be the authoritative source.

## 2. CLI Architecture

The CLI uses the following libraries and patterns:

| Concern                | Decision                                                                                             | Upstream link                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Command routing        | [Clipanion](https://github.com/arcanis/clipanion)                                                    | `packages/cli/src/commands/*`                            |
| Runtime config loading | [`cosmiconfig`](https://github.com/cosmiconfig/cosmiconfig) with `tsx` exec fallback                 | To be implemented                                        |
| Validation             | Typanion schemas (`packages/cli/src/utils/validation.ts`)                                            | To be implemented                                        |
| Logging                | [`createReporter`](../kernel/src/reporter/create-reporter.ts) with LogLayer                          | Already available                                        |
| Formatting             | [`prettier`](https://prettier.io/) + [`prettier-plugin-php`](https://github.com/prettier/plugin-php) | To be wired                                              |
| Type generation        | [`json-schema-to-ts`](https://github.com/ThomasAribart/json-schema-to-typescript)                    | Already used in `app/showcase/scripts/generate-types.sh` |
| Namespace helpers      | [`packages/kernel/src/namespace`](../kernel/src/namespace) (`sanitizeNamespace`, `detectNamespace`)  | Must be reused for defaults                              |

All CLI commands MUST pass through `pnpm --filter @geekist/wp-kernel-cli` and respect the reporter level flags (`--json`, `--verbose`). Loader output MUST include `{ config, sourcePath, configOrigin, composerCheck }` so downstream commands can emit precise diagnostics.

## 3. Configuration Schema (v1)

```ts
export interface KernelConfigV1 {
	version: 1;
	namespace: string; // validated/sanitised via @geekist/wp-kernel namespace helpers
	schemas: Record<string, SchemaConfig>;
	resources: Record<string, ResourceConfig>;
	adapters?: AdaptersConfig;
}

type AdaptersConfig = {
	php?: PhpAdapterFactory;
	// future adapters (telemetry, docs, etc.) can be added here
};

type PhpAdapterFactory = (context: AdapterContext) => PhpAdapterConfig | void;

interface AdapterContext {
	config: KernelConfigV1;
	reporter: Reporter;
	ir?: IRv1; // provided after IR construction
	namespace: string; // canonical value from kernel namespace module
}

interface PhpAdapterConfig {
	namespace?: string; // defaults derive from config.namespace using sanitizeNamespace
	autoload?: string; // defaults to 'inc/'
	customise?: (
		builder: PhpAstBuilder,
		context: Required<Pick<AdapterContext, 'config' | 'reporter'>> & { ir: IRv1 }
	) => void;
}

`Reporter` refers to the framework logger exported from [`packages/kernel/src/reporter/create-reporter.ts`](../kernel/src/reporter/create-reporter.ts). `PhpAstBuilder` will be provided by the CLI printers and exposes helpers to mutate namespaces, imports, docblocks, and class members before formatting.
```

- **SchemaConfig** and **ResourceConfig** – imported directly from `@geekist/wp-kernel/resource`. Use the kernel types as-is; the CLI must not introduce alternative shapes.
- **AdaptersConfig**
    - Optional, lets consumers customise emission without duplicating config data.
    - Factories receive the full config (and later IR) so they can derive defaults rather than redefining values.
    - Returning `undefined` preserves default behaviour; returned values override printer defaults.

The CLI MUST validate configs using Typanion, emitting diagnostics that include file path and property (e.g. `kernel.config.ts:resources.job.routes.list.method`).

**Identifier precedence note**: `store.getId` ultimately used at runtime respects this order:

1. explicit `store.getId` passed to `defineResource`;
2. CLI-generated wrapper derived from `identity` (available when consuming CLI-generated resource helper or store config);
3. runtime fallback `(item) => item.id`.

CLI validation MUST warn when `identity.type` conflicts with route params, synthesized schema, or generated store behaviour (e.g., numeric route paired with string identity).

## 4. Intermediate Representation (IR)

The IR bridges config and printers, ensuring stable evolution.

```ts
interface IRv1 {
	meta: {
		version: 1;
		namespace: string;
		sourcePath: string;
		origin: ConfigOrigin;
		sanitizedNamespace: string;
	};
	schemas: IRSchema[];
	resources: IRResource[];
	policies: IRPolicyHint[];
	blocks: IRBlock[];
	php: IRPhpProject;
}
```

- **IRSchema**: resolved absolute path, parsed JSON Schema, per-schema SHA-256 hash for change detection.
- **IRResource**: includes normalized REST routes, policy keys (from config or naming convention), cache key templates, identifier hints, persistence metadata, synthesized schema provenance (`'auto'` vs provided), and per-resource SHA-256 hash (combined route + policy signature) after canonical JSON stringify and normalised EOLs.
- **IRPolicyHint**: inferred policy identifiers to feed PHP permission callbacks later.
- **IRBlock**: discovered from `blocks/**/block.json`, aligning with current manifest behaviour described in [`app/showcase/build/blocks-manifest.php`](../../app/showcase/build/blocks-manifest.php).
- **IRPhpProject**: PSR-4 root (`WPKernel\Showcase`), target directories (`inc/Rest`), Composer autoload hints (see [`app/showcase/composer.json`](../../app/showcase/composer.json)).
- Sanitized namespaces are derived with [`sanitizeNamespace`](../kernel/src/namespace/sanitize-namespace.ts) to ensure parity with runtime behaviour.
- **Adapter context**: after IR construction, adapters receive `{ config, ir, reporter }`, keeping all customisation sourced from the same data.

The IR module must ensure determinism-same config yields identical IR. All transforms must be pure (no side effects outside return value).

## 5. Printers & Emitters

Printer modules convert IR to concrete files:

- **Type definitions**: `printTypes(irSchema)` leverages `json-schema-to-ts` to emit `.generated/types/*.d.ts`. Output paths MUST match `schema.generated.types` and format via `prettier`.
- Emit `.generated/types/index.d.ts` re-exporting all generated interfaces to simplify consumer imports.
- **Validators (future)**: optionally emit `.generated/validators/*.dev.ts`.
- **REST args**: PHP array files under `.generated/rest-args/*.php` mirroring REST validation rules; leverage WordPress functions `rest_validate_value_from_schema` and `rest_sanitize_value_from_schema`. When `schema: 'auto'`, the CLI synthesises schema segments from `storage`.
- **PHP bridge**:
    - Base controller and resource controllers follow PSR-4 under `.generated/php/Rest`.
    - Generated header comments MUST cite cfg origin (e.g. `Source: kernelConfig.resources.job`).
    - Headers also include source config path (`kernel.config.ts`) and specific property addresses (e.g. `resources.job.routes.list`).
    - Use a minimal PHP AST to render class structures; final formatting handled by `prettier-plugin-php`.
    - Persistence helpers honour `storage` metadata: CLI emits CPT/taxonomy/option registration under `.generated/php/Registration/**` and ensures controllers resolve identifiers (numeric IDs vs slug/uuid lookup).
    - Apply sanitized namespace from kernel namespace utilities to guarantee parity with runtime expectations.
    - Guarded regions with markers:
      `php
      /\*\*
    * AUTO-GENERATED by WP Kernel CLI.
    * Edits within WPK:BEGIN AUTO / WPK:END AUTO will be overwritten.
      _/
      // WPK:BEGIN AUTO
      // …
      /_ WPK:END AUTO \*/
      `
- Emit `.generated/php/index.php` including return map of generated classes to file paths. This script can be required by bootstrap code to load all generated controllers lazily.
    - **Blocks manifest**: replicate existing behaviour from [`packages/kernel/src/resource/block-manifest.ts`](../kernel/src/resource/block-manifest.ts) (if available) or current showcase manifest logic.

Adapters can inject custom behaviour by returning a `customise` function. The CLI will provide a `PhpAstBuilder`-a thin wrapper around the generated AST (namespace, uses, class methods)-so adapters can add imports, docblocks, or method bodies before formatting. Because the adapter receives `{ config, ir, reporter }`, it can inspect resources/schemas without redefining them.

## 6. Commands

### `wpk generate`

1. Load & validate config (capture `configOrigin`).
2. Build IR (`IRv1`).
3. Evaluate adapters (config-first, optional IR customisation).
4. Print artifacts to `.generated/**`, skipping unchanged files via hash comparison.
5. Summarise via reporter:
    - Counts and relative paths for written/unchanged/skipped files.
    - Skipped items (with reason).
    - Errors (with stack traces).

Exit codes:

- `0` success;
- `1` validation failure;
- `2` printer failure;
- `3` adapter/extension failure (command aborts without writing partial output).

### `wpk apply`

1. Ensure `.generated/**` clean commit (`git status --porcelain` check) unless `--yes`.
2. Copy `.generated/php/**` → `inc/**` and `.generated/build/**` → `build/**`.
3. Only overwrite sections inside `WPK:BEGIN/END AUTO`; abort if manual edits detected unless `--force`.
4. Optional `--backup` writes `.bak` files before overwrite.
5. Write `.wpk-apply.log` summarizing actions and PSR-4 validation.
6. Reporter output includes diff hints (old hash → new hash) and post-apply status.

### `wpk dev`

1. Watch `kernel.config.ts`, `contracts/**`, `src/resources/**`, `blocks/**`.
2. Watcher must ignore `.git`, `node_modules`, `build`, `.generated` to avoid infinite loops.
3. On change, rerun generate pipeline with debounce tiers (fast path for config/routes, slow path for schema updates); auto-apply JS artifacts, with PHP auto-apply behind `--auto-apply-php`.
4. Re-evaluate adapters each cycle; respect reporter throttling and handle graceful shutdown.

### Future commands

- `wpk lint` & `wpk typecheck`: wrappers around repo scripts with reporter integration (existing packages already house ESLint/TSConfig).

## 7. Safety & Guardrails

- **Composer parity** – Ensure `composer.json` autoload maps to `inc/` (e.g. `"WPKernel\\Showcase\\": "inc/"`). Fail with guidance if mismatch.
- **PSR-4 compliance** – Validate generated class names match file structure (`Rest/JobsController.php` → `WPKernel\Showcase\Rest\JobsController`).
- **Namespace parity** – Default namespaces must come from kernel namespace helpers; raise if sanitisation alters the original and report the final value.
- **Route hygiene** – Reject duplicate method/path combinations across resources, reserved WP REST prefixes, path traversal (`../`), or absolute paths.
- **Policy consistency** – Warn/error when a route references a policy key not present in the final policy map.
- **Versioning** – Config and IR include `version: 1`. CLI warns on mismatch, offers migration instructions.
- **Backups** – Before apply, optional `--backup` flag writes `.bak` copies of target files.

## 8. Testing Strategy

- **Unit tests** for loader, validator, IR builder, printers.
- **Golden snapshots** for IR JSON and generated PHP/TS outputs (stored under `packages/cli/src/__fixtures__`).
- **Integration tests** using temporary directories simulating plugin layout (see Node `fs.mkdtemp`).
- Leverage existing test harness: [`packages/cli/jest.config.js`](./jest.config.js).

## 9. Documentation & Adoption

- `README.md` (CLI package) must be updated with usage examples referencing actual showcase paths.
- Showcase plugin should adopt CLI-generated artifacts once commands stabilize (see `app/showcase/.generated/php`).
- Align with repository policies in [`AGENTS.md`](../AGENTS.md) and showcase agent guide.

---

For implementation sequencing, refer to the phased plan in [`PHASES.md`](./PHASES.md). Each phase references the relevant sections of this specification.
