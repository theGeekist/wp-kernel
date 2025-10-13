Got it - we’ll stay at the **printer layer only** (no command wiring), and spell out exactly **what each printer must infer from `kernel.config.ts` and emit**. This is the contract your implementers can code against right now.

---

# Printers - Scope, Inputs, Decisions, Outputs

All printers take a **fully-validated IR** (Phase 1A/1B) and a `FS` helper (read/write, exists, glob) and return a list of emitted files with content (no side-effects). Command orchestration (`wpk build/dev/apply`) is out-of-scope here.

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

**Inputs:** `ir.blocks[]` filtered where `hasRender === false`.

**Decisions:**

- Emit a single source entry that **auto-registers** discovered client-only blocks (helpful baseline; authors can still import individually).

**Outputs:**

- `.generated/blocks/auto-register.ts` containing:

```ts
/* AUTO-GENERATED by WPK */
import { registerBlockType } from '@wordpress/blocks';

// Each discovered block.json under blocks/** (source) gets an import
// e.g. import * as JobBlock from '../../blocks/job/block.json';
${ir.blocks.filter(b => !b.hasRender).map(b =>
  `import * as ${camel(b.key)} from ${relImportToSource(b.directory)}/block.json;`
).join('\n')}

const blocks = [${ir.blocks.filter(b => !b.hasRender).map(b => camel(b.key)).join(', ')}];
blocks.forEach( (meta) => registerBlockType(meta as any) );
```

**Notes:**

- This file is a **source artifact** (to be bundled by Vite).
- If no JS-only blocks exist, skip emitting.

### 3.2 SSR blocks (have `render.php`)

**Inputs:** `ir.blocks[]` filtered where `hasRender === true`.

**Decisions:**

- The **manifest** must reflect the **built** layout (`build/blocks/**/block.json`). Since we’re only scoping printers, split responsibilities:
    - **Source-time printer** (now): emit the **registrar stub** that expects a manifest at runtime.
    - **Build-time emitter** (later in command orchestration): scan `build/blocks/**/block.json` and write `build/blocks-manifest.php`.

**Outputs (source-time):**

- `.generated/php/Blocks/Register.php`:

```php
<?php
/**
 * AUTO-GENERATED by WPK.
 * Registers SSR blocks using a build manifest.
 */
namespace ${PhpNs}\Blocks;

defined( 'ABSPATH' ) || exit;

// WPK:BEGIN AUTO
function register_ssr_blocks() {
    $manifest_path = plugin_dir_path( __FILE__ ) . '../../build/blocks-manifest.php';
    if ( file_exists( $manifest_path ) ) {
        $blocks = require $manifest_path;
        foreach ( $blocks as $dir => $metadata ) {
            register_block_type( plugin_dir_path( __FILE__ ) . "../../build/$dir", $metadata );
        }
    }
}
add_action( 'init', __NAMESPACE__ . '\\register_ssr_blocks' );
// WPK:END AUTO
```

- **(No manifest file here.)** The manifest is a **build artifact** to be created by the build pipeline later.

**Validation/notes:**

- If no SSR blocks are discovered, skip emitting the registrar.
- If both SSR and JS-only exist, both printers run (registrar + auto-register.ts).

---

## 4) UI Printer (DataViews)

**Inputs:** `resource.ui.admin.dataviews` (if present), `ir.meta.namespace`

**Decisions:**

- Emit a screen wrapper + TS fixtures + tiny PHP menu shim.

**Outputs:**

- `.generated/ui/<Resource>Screen.tsx` – imports runtime `configureKernel` usage from project’s `src/index.ts` assumption (no runtime wiring here); uses the serialized dataviews fixture.
- `.generated/ui/<Resource>.dataviews.ts` – the serialized config (`fields`, `defaultView`, `mapQuery`, `getItemId`, etc.). Functions are stringified as-is.
- `.generated/php/Menu_<Resource>Screen.php` – calls `add_menu_page` (or submenu) and enqueues the built JS bundle for that screen.

**Validation/notes:**

- If function serialization detects closures (uses out-of-scope symbols), warn in output summary.

---

## 5) Inferences from `ResourceConfig` → `block.json` (when authors ask us to scaffold a block)

This is optional **block scaffolding** from a resource. If the IR includes a `resource.blocks?.scaffold` flag (future), the Blocks printer can emit a **minimal block** coupled to that resource:

**Inferences:**

- `apiVersion`: **3**
- `name`: `${namespace}/${resource.name}`
- `title`: PascalCase of resource name (or `resource.ui.title` if present)
- `category`: `widgets` (default) or `resource.ui.category`
- `textdomain`: `${namespace}`
- Modules:
    - `editorScriptModule`: `'file:./index.tsx'` (always; edit UI)
    - `viewScriptModule`: present **only** if the resource has **GET/list** routes **and** no `render.php` (i.e., dynamic client view logic); else omit.

- SSR:
    - If the scaffold asks for SSR, include `"render": "file:./render.php"`; else omit.

- Supports: default to a sane starter `{ "html": false }`.

**Minimal block stubs to emit (source):**

- `blocks/<resource>/block.json` (as above)
- `blocks/<resource>/index.tsx`:

```ts
import { registerBlockType } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import metadata from './block.json';

registerBlockType(metadata.name, {
  edit() {
    // Minimal editor chrome
    return <div>{metadata.title}</div>;
  }
});
```

- If `viewScriptModule` chosen: `blocks/<resource>/view.ts`:

```ts
// Runs on the front-end when the block is rendered.
// For dynamic client behaviour (e.g., hydrate from REST).
export default function () {
	// TODO: fetch/hydrate via resource routes if needed
}
```

- If SSR: `blocks/<resource>/render.php` (empty template with docblock):

```php
<?php
/**
 * Server render callback for the block.
 * Use resource REST routes or WP primitives as needed.
 */
return function( array $attributes, string $content, array $context ) {
    // TODO: output markup
    return $content ?: '';
};
```

**Note:** this “scaffold from resource” is optional and can be added later. The core Block printers (3.1, 3.2) work purely from discovered block folders.

---

## 6) Errors / Warnings Printers Must Produce

- **PHP override visibility**: if a template would emit `protected/private` for methods declared `public` upstream, **error** (hard stop).
- **Identity mismatches**: e.g., `uuid` identity without a meta key for `wp-post` → warn and stub `get`.
- **Policy gaps**: write routes without `policy` → warn; permission_callback defaults to `manage_options`.
- **Function serialization** (UI printer): detect captured variables and warn that stringified functions must be pure.
- **Block registrar without build**: N/A at printer time (registrar only expects a path); orchestration will check at apply/build.

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

This gives your team everything needed to implement the printers now, while keeping the later command orchestration (dev/build/apply) straightforward.
