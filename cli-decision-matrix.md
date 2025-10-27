# WP Kernel CLI Command Matrix

This document summarizes the responsibilities and outputs of the core CLI commands (`init`, `generate`, `apply`) as implemented in the `@wpkernel/cli` package, and validates their alignment with the decision matrix for printers and build orchestration.

---

## Command Responsibilities Overview

| Command    | Scope & Responsibility                                                           | Output Locations     | Runs Printers? |
| ---------- | -------------------------------------------------------------------------------- | -------------------- | -------------- |
| `init`     | Scaffolds project structure, config, entrypoint, linting presets.                | Project root, `src/` | No             |
| `generate` | Runs all printers, emits source artifacts, surfaces all matrix warnings/errors.  | `.generated/**`      | Yes            |
| `apply`    | Copies/moves generated artifacts to runtime locations, orchestrates build steps. | `inc/`, `build/`     | No             |

---

## Global Invariants (apply to all sections)

- **Command boundaries are strict:** `init` scaffolds only; `generate` runs printers only; `apply` copies/orchestrates only. No cross‑over.
- **Printer write scope:** printers may write **only** under `.generated/**` (unless explicitly whitelisted in Outputs); runtime paths (`inc/`, `build/`) are handled by `apply`.
- **Formatting:** TS via Prettier; PHP via Prettier PHP. Generated PHP wraps mutable regions in `WPK:BEGIN/END AUTO`.
- **Production‑mimic deps:** generated projects reference `@wpkernel/*` as `"latest"`; actual registry resolution is environmental (`.npmrc`, CI setup).
- **Version source of truth:** supported versions for React/ReactDOM/Vite/TypeScript and key `@wordpress/*` are maintained in a **single central map** consumed by `init` and any templates.
- **No samples here:** this document captures **contracts and decisions**. Any illustrative examples live in the showcase.

## Authoritative Path Map (this repository)

- **CLI entry & runtime:** `bin/wpk.js`, `src/cli/index.ts`, `src/cli/run.ts`
- **CLI bundled versions manifest:** `dist/cli/versions.json` (build-time generated; consumed by `init` when running stand-alone).
- **Commands (source of truth):** `src/commands/*.ts`
    - Notable: `src/commands/init.ts`, `src/commands/generate.ts`, `src/commands/apply.ts`
- **IR (builder + types + helpers):** `src/ir/**`
    - Notable: `src/ir/build-ir.ts`, `src/ir/types.ts`, `src/ir/block-discovery.ts`
- **Policy map resolver (author code entry):** `src/policy-map.ts`
- **Printers (all):** `src/printers/**`
    - Blocks: `src/printers/blocks/{js-only,ssr,derived-blocks}.ts`
    - PHP: `src/printers/php/**`
    - Types: `src/printers/types/printer.ts`
    - UI: `src/printers/ui/printer.ts`
- **Scaffold templates for `init`:** `templates/init/**`
    - Provides initial `package.json`, `tsconfig.json`, `wpk.config.ts`, `eslint.config.js`, `src/index.ts`, and PHP `inc/` placeholders.
- **Build output (compiled distribution):** `dist/**`
- **Tests:** `src/**/__tests__/**`, plus integration tests under printer-specific `__tests__` folders.

## 1. `init` Command

- **Purpose:** Scaffolds a new WP Kernel project (config, entrypoint, linting, etc.).
- **Outputs:** Project files in root and `src/`.
- **Does NOT:** Run printers, emit `.generated/**` artifacts, or perform build/copy steps.

## 2. `generate` Command

- **Purpose:** Runs all printers (Types, PHP, Blocks, UI) using IR/config.
- **Outputs:** Source artifacts under `.generated/**` only.
- **Validation:** Surfaces all warnings/errors as described in the decision matrix (policy gaps, identity, function serialization, etc.).
- After printers complete, the CLI validates that the generated imports resolve against the current workspace and installed packages; failures surface as `ValidationError` with the formatted TypeScript diagnostics.
- **Does NOT:** Copy/move files to runtime locations, run build steps, or scaffold project structure.

## 3. `apply` Command

- **Purpose:** Moves/copies generated artifacts from `.generated/**` to runtime locations (`inc/`, `build/`).
- **Outputs:** Runtime files for WordPress and build pipeline.
- **Validation:** Ensures cleanliness, can backup/force, logs the operation, orchestrates build-time steps (e.g., block manifest).
- **Does NOT:** Run printers or scaffold project structure.

## 1a. `init` - Decisions & Implementation Contract (Global)

**Scope (unchanged):** Bootstraps a minimal project; does **not** run printers. Designed to mimic production dependency shape.

**CLI shape**

- Positional name: `init <name>` (drop `--name`).
- Validate/sanitise `<name>` to a valid npm package name.
- Fail if target directory exists (unless `--force`).

**Artifacts (must create)**

- `package.json` seeded from `<name>`:
    - `dependencies`: `@wpkernel/*` set to `"latest"` (prod-mimic; actual registry resolution is environmental).
    - WordPress/React deps declared per **Dependency Policy** (below).
    - Minimal scripts (`build`, `dev`, `typecheck`) aligned with the showcase.
- `vite.config.*` with externals/globals for React and `@wordpress/*` (no bundling of WP globals).
- `tsconfig.*` with sane defaults (ES modules, JSX, strict).
- Minimal source skeleton (`src/` entrypoint).
- _(Optional)_ `.npmrc` to pin a scoped registry only when an explicit flag is provided (environmental `.npmrc` takes precedence).

**Dependency Policy**

- **Required:** `@wpkernel/*` pinned to `"latest"`.
- **Supported strategies for WP/React (either is valid):**
    1. **Peers + DevDeps (DX-friendly default):** declare `react`, `react-dom`, and required `@wordpress/*` in `peerDependencies`, and also in `devDependencies` to satisfy local builds and types.
    2. **Peers-only (stricter parity):** declare only in `peerDependencies`; relies on ambient types/shims for local builds.
- Implementation MUST keep a **single source of truth** for supported versions (React/ReactDOM/Vite/TypeScript and key `@wordpress/*`) that the scaffold reads from.

**Version Resolution for WP/React (deterministic)**

- **Peers first:** All `@wordpress/*`, `react`, and `react-dom` MUST appear in `peerDependencies` (devDependencies may also include them for DX).
- **Resolution order (what the CLI reads to pick versions):**
    1. **Local framework context (preferred):** if `@wpkernel/core` is resolvable from CWD, read its `peerDependencies` for `@wordpress/*`, `react`, `react-dom` using `require.resolve('@wpkernel/core/package.json')`.
    2. **Bundled manifest (stand-alone safe):** read `@wpkernel/cli`’s **build-time manifest** at **`dist/cli/versions.json`** (packaged in the published tarball). Generated during the CLI build from the repo’s `@wpkernel/core` on the same commit. Shape:
        - `generatedAt` (ISO8601), `coreVersion` (semver), and `peers` (map of `@wordpress/*`, `react`, `react-dom`).
        - If the manifest is **missing**, treat it as a scope-of-work: the build must generate it; until then, proceed to the next step.
    3. **Registry introspection (opt-in):** if `WPK_PREFER_REGISTRY_VERSIONS=1` or `--prefer-registry-versions` is set, query `${REGISTRY_URL or https://registry.npmjs.org}/@wpkernel/core`, resolve the `dist-tags.latest`, and read that version’s `peerDependencies`. Network errors fall back to prior steps.
    4. **Template defaults:** fall back to `templates/init/package.json` for any remaining unresolved keys.
    5. **Fail safe:** if any required peer remains unresolved after the above, **abort** with `init.versions.missing` and guidance to set a versions file or install `@wpkernel/core`.
- **Overrides:**
    - `--wp-versions <path>` or `WPK_VERSIONS_FILE` → JSON file with `{ peers: { "@wordpress/element": "...", "react": "...", ... } }` to fully override.
    - `REGISTRY_URL` → registry host used when step (3) is enabled (defaults to npm; CI may point to `https://registry.geekist.co/`).
    - `WPK_PREFER_REGISTRY_VERSIONS=1` or `--prefer-registry-versions` → prefer live registry data over the bundled manifest when local `core` is absent.

**Out-of-band test orchestration (context)**

- A separate Cloud Task can provide a **prod‑mimic registry shim** so `"latest"` resolves to private builds during CI/dev:
    - Redirect scope `@wpkernel` to a private registry.
    - Publish current workspace packages under the `latest` dist‑tag.
    - Keep generator code unchanged.

**Acceptance checks**

- `init` produces all artifacts above without invoking printers and without writing to runtime paths (`inc/`, `build/`).
- In CI: `pnpm -C <name> install` and `pnpm -C <name> build` succeed when the environment maps `@wpkernel` to a registry that serves `latest`.
- Build output must not inline React or `@wordpress/*` (externals respected).

**Notes**

- No samples embedded here; see showcase for patterns.
- Installation is performed by CI/task orchestration; a future `--install` flag MAY trigger install, but default behaviour is scaffold‑only.

---

## Printer Scope & Enforcement

- Printers are only invoked by the `generate` command.
- `init` and `apply` never run printers.
- `apply` only moves/copies and orchestrates build, never generates code.

---

## Validation Checklist

- [x] Each command’s scope is enforced in code.
- [x] All warnings/errors from the decision matrix are surfaced during `generate`.
- [x] No command oversteps its responsibility.
- [x] All commands are implemented in the `@wpkernel/cli` package.

---

## Implementation Status & Validation (Current)

### IR Validation

- **IR construction (`build-ir.ts`)** assembles all required fields: `meta`, `schemas`, `resources`, `policies`, `policyMap`, `blocks`, `php`; performs discovery for schemas/resources/blocks/policy hints; resolves the policy map with fallback + missing/unused warnings; and ensures shapes match this matrix.
- **IR types (`types.ts`)** define `IRSchema`, `IRResource`, `IRBlock`, `IRPolicyMap`, etc., with all resource fields (`identity`, `storage`, `routes`, `queryParams`, `ui`, `warnings`) and block/policy structures (SSR vs JS-only) aligned; warnings/errors are represented for downstream printers.

### Printer Validation

- **Types printer** iterates `ir.schemas[]`, emits one `.d.ts` per schema, supports custom output path + index re-exports, includes a content-hash banner, and errors on duplicate output targets.
- **Blocks printer (JS-only)** filters `ir.blocks[]` for `!hasRender`, emits the auto-register source, and skips when empty.
- **PHP printer** composes policy helpers (fallback + map; resource/object scopes; `current_user_can` wiring), builds REST args (threads `identity` + `queryParams`), enforces method visibility, handles identity resolution, and surfaces policy/identity warnings as specified.
- **UI printer** consumes `resource.ui.admin.dataviews` + `ir.meta.namespace`, emitting a screen wrapper, serialized fixtures, and a PHP menu shim.

### Matrix Compliance (summary)

- **Inputs:** All printers consume IR with the required fields.
- **Decisions:** Filtering, output paths, fallbacks, and warning/error surfacing match this decision matrix.
- **Outputs:** All printer outputs are scoped under `.generated/**` only.
- **Scope:** Printers don’t overstep; command orchestration remains with `init`, `generate`, `apply`.

> Conclusion: Current IR and printers conform to this matrix. This document remains the validation point for future changes.

## References

- CLI source (commands): `src/commands/`
- CLI entry/runtime: `bin/wpk.js`, `src/cli/`
- IR builder & types: `src/ir/`
- Printers (by category): `src/printers/**`
- CLI versions manifest (peer versions for scaffold): `dist/cli/versions.json`: generated during CLI build;
- Scaffolded dependency defaults (current source of truth for `init`): `templates/init/package.json`, `templates/init/tsconfig.json`  
  _(Future consolidation: hoist versions to a single module imported by `init`.)_

This matrix ensures the CLI implementation matches the architectural and operational guarantees described in the decision matrix.

# Printers - Scope, Inputs, Decisions, Outputs

**Common guarantees from IR:**

- `ir.meta.namespace`
- `ir.schemas[]` (explicit or auto-synthesized)
- `ir.resources[]` (with `identity`, `storage`, `routes`, `schemaKey`, `policyHints?`)
- `ir.blocks[]` (from block discovery; each `{ key, directory, hasRender, manifestSource }`)
- Paths are workspace-relative; printers only write under `.generated/**` unless noted.

Formatting: TS via Prettier; PHP via Prettier PHP. All PHP files include **WPK:BEGIN/END AUTO** fences.

---

## 1) Types Printer

**Inputs:** `ir.schemas[]`

**Decisions:**

- Always emit types for every schema.
- File path: `schema.generated.types` if provided, else `.generated/types/<SchemaName>.d.ts`.

**Outputs:**

- One `.d.ts` per schema.
- `.generated/types/index.d.ts` re-exporting PascalCase type names.

**Validation/notes:**

- If two schemas map to the same output file, error with a deterministic message.
- Keep a content hash comment to help apply detect no-op rewrites.

---

## 2) PHP Printer (REST + Persistence)

**Inputs:** `ir.resources[]`, `ir.meta.namespace`, `ir.policies?`

**Decision matrix per resource (derived, no extra config):**

| Condition                                                                   | Controller Body                                                                   | Bootstrap | Notes                                                                                                                                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Has ≥1 **local route** and `storage.mode === 'wp-post'`                     | **CRUD implementation** (list/get/create/update/remove) using WP primitives       | Yes       | REST arg arrays from schema + `queryParams`. Resolve identity (`id/slug/uuid`) per `resource.identity`. Permission callbacks wired using available policy hints (denied ⇒ 403). |
| Has ≥1 local route and `storage.mode ∈ {wp-taxonomy, wp-option, transient}` | **Mode-specific implementation** or explicit `WP_Error(501)` where unsupported    | Yes       | Taxonomy CRUD (terms), options get/update, transients get/set/delete.                                                                                                           |
| Has ≥1 local route and **no storage**                                       | **Stub** methods returning `WP_Error(501, 'Not Implemented')` with TODO docblocks | Yes       | Scaffolds the shape so teams can hand-fill later.                                                                                                                               |
| All routes remote (absolute/outside namespace) or none                      | **Skip** resource entirely                                                        | No        | Thin client-only.                                                                                                                                                               |

**Outputs:**

- `.generated/php/Rest/BaseController.php` (once)
- `.generated/php/Rest/<Resource>Controller.php` (per resource that meets “local route”)
- `.generated/php/Bootstrap.php` - registers routes for all local resources
- `.generated/php/Policy/policy.php` - **only if** policy hints exist (mirrors keys → `current_user_can` map)
- `.generated/php/index.php` - PSR-4 classmap for generated files
- `.generated/rest-args/<resource>.php` - REST argument arrays (list/get/create/update/remove) derived from schema and `queryParams`

**Implementation specifics the printer must honor:**

- **Visibility**: any override of `WP_REST_Controller` methods MUST be `public` (your earlier fatal).
- **Identity handling**:
    - `id:number` → numeric param.
    - `slug` → resolve via `get_page_by_path` / `WP_Query` on `name`.
    - `uuid` → resolve via meta lookup if storage defines a `uuid` meta key; otherwise guarded `WP_Error(400, ...)`.

- **Permission callbacks**:
    - If a route has a `policy` hint, wire `permission_callback` to `wpk_check_policy( 'key', [args] )`.
    - If missing on **writes** (create/update/remove), warn and default to `current_user_can( 'manage_options' )`.

#### Policy map resolution

- The policy map is discovered at `src/policy-map.{ts,js,mjs,cjs}` (first match wins).
- The module may export either the map object directly or an object containing `{ policyMap: <map> }`.
- Each policy map entry may be:
    - a **string** capability (assumed `{ appliesTo: 'resource' }`);
    - a **descriptor** `{ capability, appliesTo?: 'resource' | 'object', binding?: string }`;
    - or a **function** (sync/async) that resolves to either of the above.
- The field `appliesTo` must be `"resource"` or `"object"`; invalid values raise a `ValidationError`.
- For `"object"` scope, if no binding is declared, the resolver tries to infer a request parameter name from referenced resources’ `identity.param`.
    - If exactly one unique param is inferred, it is used.
    - Otherwise, a warning `policy-map.binding.missing` is emitted (helper may default to `"id"`).
- If no map file is found or referenced policies are absent, the system falls back to `"manage_options"` and emits warnings.

- **REST arg arrays**:
    - Use schema’s `required` + `type` to build sanitize/validate arrays.
    - Thread `queryParams` (from IR) into the list route’s args.

- **Fences**: generated class files wrap **only** the method bodies and registration arrays with `WPK:BEGIN/END AUTO`, leaving room for custom helpers below.

**Validation/notes:**

- If `storage.mode === 'wp-post'` and `postType` was inferred, include a docblock noting the inference.
- If `identity.param === 'uuid'` but no meta key named `uuid` exists in `storage.meta`, emit a build-time warning and fall back to stub for `get`.

---

## 3) Blocks Printer

Two sub-printers; both act from **IR** + file system helpers. No command wiring here.

### 3.1 JS-only blocks (no `render.php`)

- **Outputs:** `.generated/blocks/auto-register.ts`.
- **Contract:** Must import each discovered `blocks/**/block.json` (JS-only) and call `registerBlockType` for each. No output if the filtered set is empty. No side effects beyond registration. Formatting via project Prettier.

### 3.2 SSR blocks (have `render.php`)

- **Outputs:** `.generated/php/Blocks/Register.php`.
- **Contract:** Registrar loads a **build-time manifest** from `build/blocks-manifest.php`, iterates entries, and calls `register_block_type()` for each SSR block directory and metadata. The manifest itself is not emitted by printers. Namespacing must follow `ir.meta.namespace`. Hook on `init`. Generated regions should be wrapped in `WPK:BEGIN/END AUTO`.

---

## 4) UI Printer (DataViews)

**Inputs:** `resource.ui.admin.dataviews` (if present), `ir.meta.namespace`

**Decisions:**

- Emit a screen wrapper + TS fixtures + tiny PHP menu shim.

**Outputs:**

- `.generated/ui/<Resource>Screen.tsx` - imports runtime `configureKernel` usage from project’s `src/index.ts` assumption (no runtime wiring here); uses the serialized dataviews fixture.
- `.generated/ui/<Resource>.dataviews.ts` - the serialized config (`fields`, `defaultView`, `mapQuery`, `getItemId`, etc.). Functions are stringified as-is.
- `.generated/php/Menu_<Resource>Screen.php` - calls `add_menu_page` (or submenu) and enqueues the built JS bundle for that screen.

**Validation/notes:**

- If function serialization detects closures (uses out-of-scope symbols), warn in output summary.

---

## 5) Inferences from `ResourceConfig` → `block.json` (when authors ask us to scaffold a block)

This is optional **block scaffolding** from a resource. If the IR includes a `resource.blocks?.scaffold` flag (future), the Blocks printer can emit a **minimal block** coupled to that resource:

**Outputs (if scaffold enabled):**

- `blocks/<resource>/block.json` - minimal manifest per inferences above.
- `blocks/<resource>/index.tsx` - editor entry; minimal edit UI; no external side effects.
- `blocks/<resource>/view.ts` - only when `viewScriptModule` chosen; front-end bootstrap stub.
- `blocks/<resource>/render.php` - only when SSR chosen; returns a callable render function placeholder.

**Contract:** Scaffolded files must be minimal, compile without additional project code, and defer all business logic to authors. No code examples embedded in this document; see showcase for reference.

---

## 6) Errors / Warnings Printers Must Produce

- **PHP override visibility**: if a template would emit `protected/private` for methods declared `public` upstream, **error** (hard stop).
- **Identity mismatches**: e.g., `uuid` identity without a meta key for `wp-post` → warn and stub `get`.
- **Policy gaps**: write routes without `policy` → warn; permission_callback defaults to `manage_options`.
- **Function serialization** (UI printer): detect captured variables and warn that stringified functions must be pure.
- **Block registrar without build**: N/A at printer time (registrar only expects a path); orchestration will check at apply/build.

- **Policy map warnings (from resolver):**
    - `policy-map.missing` - No `src/policy-map.*` found; using fallback capability for referenced policies.
    - `policy-map.entries.missing` - Policies referenced by routes are not defined in the policy map.
    - `policy-map.entries.unused` - Policies defined in the map are not referenced by any route.
    - `policy-map.binding.missing` - Policy targets an object but a request parameter couldn’t be inferred (helper may default to `id`).
- **Policy map errors (fail build):**
    - Invalid `appliesTo` scope (must be `"resource"` or `"object"`).
    - Policy map module failed to load or didn’t export a policy map object.
    - Policy map entry function threw during evaluation.

---

## 7) What’s explicitly **not** this printer’s job

- Running Vite or generating **`build/blocks-manifest.php`** (that’s a **build-time emitter** the command will call _after_ the bundle exists).
- Copying to `inc/` or `build/` (that’s `apply`).
- Creating `src/index.ts` or project scaffolding (`init`).
- Executing adapters; though printers **must accept** IR already transformed by adapters.

---

### TL;DR

- **Types**: emit `.d.ts` for every schema (explicit/auto).
- **PHP**: full CRUD when `storage` present; stubs otherwise; skip for remote-only. Wire permission callbacks; handle identity; emit REST args and bootstrap.
- **Blocks**: from discovery - emit `auto-register.ts` for JS-only; emit a registrar PHP that expects a **build-time** manifest for SSR.
- **UI**: DataViews screen + fixtures + PHP menu shim when present.
- **All decisions are **inferred** from the IR/config; no new author flags.**
