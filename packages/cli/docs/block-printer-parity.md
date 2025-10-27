# Legacy Block Printer Parity

_See [Docs Index](./index.md) for navigation._

This note captures the observable behaviour of the legacy block printers under
`packages/cli/src/printers/blocks/**` so the Phase 3 builders can replace them
without regressing manifest wiring, registrar bootstrap code, or the fallback
rendering templates.

## JS-only printer (`generateJSOnlyBlocks`)

- **Inputs** – consumes the `JSOnlyBlockOptions` shape (IR blocks, project root,
  output directory, optional source string) and immediately filters for blocks
  without `hasRender` before sorting by key. 【F:packages/cli/src/printers/blocks/js-only.ts†L29-L61】
- **Output file** – always targets `blocks/auto-register.ts` under the provided
  output directory and emits a banner that records the source of truth.
  【F:packages/cli/src/printers/blocks/js-only.ts†L41-L95】
- **Manifest validation** – loads each `block.json`, reporting read/parse
  failures and forwarding structural warnings from
  `validateBlockManifest(manifest, block)`. 【F:packages/cli/src/printers/blocks/js-only.ts†L98-L142】【F:packages/cli/src/printers/blocks/shared/template-helpers.ts†L46-L97】
- **Stub generation** – when a manifest references `file:` editor or view
  modules (`index.tsx`, `view.ts`) that do not exist, stubs are written alongside
  the manifest. 【F:packages/cli/src/printers/blocks/js-only.ts†L144-L211】
- **Registration logic** – blocks that still rely on `registerBlockType` calls
  (i.e. no file module handles registration) produce an `import` of their
  manifest JSON and a call to
  `registerBlockType(<metadata>, createGeneratedBlockSettings(<metadata>))`; the
  helper is emitted exactly once when at least one block needs it. Blocks that
  register through file modules skip the import/registration path entirely.
  【F:packages/cli/src/printers/blocks/js-only.ts†L112-L195】【F:packages/cli/src/printers/blocks/js-only.ts†L63-L94】
- **Warnings** – all warnings (file I/O failures, validation issues, missing
  stubs) are aggregated so `reportWarnings` can surface them to the reporter
  pipeline. 【F:packages/cli/src/printers/blocks/js-only.ts†L62-L139】【F:packages/cli/src/printers/blocks/shared/io.ts†L19-L33】

## SSR printer (`generateSSRBlocks`)

- **Inputs** – consumes `SSRBlockOptions`, filters for `hasRender` blocks, and
  sorts by key. 【F:packages/cli/src/printers/blocks/ssr.ts†L40-L68】
- **Per-block processing** – reads each manifest, validates it, resolves the
  declared render file or infers a `render.php` fallback, and emits stub content
  when the referenced PHP template is missing. 【F:packages/cli/src/printers/blocks/ssr.ts†L77-L231】【F:packages/cli/src/printers/blocks/ssr.ts†L232-L361】
- **Manifest entries** – stores a POSIX-encoded manifest describing the block
  directory, manifest path, and optional render path. Render paths only appear
  when the callback is file-based; callback strings short-circuit stub creation
  (`render` pointing to a PHP function leaves the manifest entry without a
  render file). 【F:packages/cli/src/printers/blocks/ssr.ts†L90-L187】【F:packages/cli/src/printers/blocks/ssr.ts†L303-L361】
- **Generated files** – writes two shared artefacts when at least one block was
  processed:
    - `build/blocks-manifest.php` exporting the manifest dictionary through a PHP
      `return` statement. 【F:packages/cli/src/printers/blocks/ssr.ts†L116-L158】【F:packages/cli/src/printers/blocks/ssr.ts†L363-L392】
    - `php/Blocks/Register.php` defining a `Register` class inside the project’s
      `Blocks` namespace with helper methods for resolving manifest directories,
      render paths, and stubbing missing templates. 【F:packages/cli/src/printers/blocks/ssr.ts†L160-L338】【F:packages/cli/src/printers/blocks/ssr.ts†L394-L532】
- **Registrar behaviour** – `register()` loads the manifest, iterates entries,
  normalises relative paths, and calls `register_block_type_from_metadata` with
  optional render arguments produced by `build_render_arguments()`. The helper
  renders templates via output buffering and gracefully returns existing block
  content if the PHP template went missing. 【F:packages/cli/src/printers/blocks/ssr.ts†L400-L532】
- **Warnings** – bubbled for unreadable manifests, invalid JSON, validation
  failures, missing render templates, and stub creation so the CLI reporters can
  surface them. 【F:packages/cli/src/printers/blocks/ssr.ts†L108-L229】【F:packages/cli/src/printers/blocks/shared/io.ts†L19-L33】

## Shared helpers (`template-helpers.ts`)

- `generateBlockImportPath` produces a relative path from the auto-register file
  to each `block.json`, ensuring a `./` prefix when the computed path is within
  the same directory tree. 【F:packages/cli/src/printers/blocks/shared/template-helpers.ts†L18-L35】
- `formatBlockVariableName` camel-cases `namespace/slug` pairs for use as
  TypeScript identifiers. 【F:packages/cli/src/printers/blocks/shared/template-helpers.ts†L37-L63】
- `validateBlockManifest` enforces required metadata (`name`, `title`,
  `category`, icon, editor script) and warns JS-only blocks when no view script
  is defined, enabling the printers to flag issues without aborting generation.
  【F:packages/cli/src/printers/blocks/shared/template-helpers.ts†L65-L97】

## Coupling with the CLI pipeline

- `emitBlockArtifacts` orchestrates legacy block generation: it prepares the
  `blocks` directory, merges manual and derived JS-only blocks, writes derived
  manifests, and then invokes the JS-only and SSR printers with the shared
  `PrinterContext`. 【F:packages/cli/src/printers/blocks/index.ts†L20-L112】
- `writeGeneratedFiles` and `reportWarnings` wrap printer output so files are
  formatted (PHP/TS) and warnings are passed to the active reporter. Any new
  builders must emit equivalent `files`/`warnings` payloads. 【F:packages/cli/src/printers/blocks/shared/io.ts†L7-L33】
- The generation command wires the printer context via `prepareGeneration`,
  which supplies formatting hooks, directory guards, and a `FileWriter` used to
  produce the CLI summary. Block builders replacing the printers must continue
  to call the context’s `writeFile` to keep summaries accurate.
  【F:packages/cli/src/commands/run-generate/prepare-generation.ts†L1-L104】【F:packages/cli/src/utils/file-writer.ts†L1-L104】
- Until the next-gen command stops delegating, `packages/cli/src/next/commands/generate.ts`
  loads the legacy command at runtime and proxies CLI options. Block builders in
  `src/next/**` therefore have to remain API-compatible with the legacy printers
  until the delegation layer is removed. 【F:packages/cli/src/next/commands/generate.ts†L1-L62】

## Behavioural guardrails to preserve

- POSIX-normalised paths in manifest entries and registrar lookups so PHP code
  remains portable across environments. 【F:packages/cli/src/printers/blocks/ssr.ts†L90-L158】【F:packages/cli/src/printers/blocks/ssr.ts†L486-L532】
- Stub generation for missing `render.php`, `index.tsx`, and `view.ts` files,
  including the specific scaffolded content that onboarding docs reference.
  【F:packages/cli/src/printers/blocks/ssr.ts†L303-L361】【F:packages/cli/src/printers/blocks/js-only.ts†L144-L211】
- Warning semantics: recoverable issues must emit reporter warnings instead of
  aborting generation so adapter rollbacks and CLI summaries stay predictable.
  【F:packages/cli/src/printers/blocks/js-only.ts†L62-L139】【F:packages/cli/src/printers/blocks/ssr.ts†L108-L229】
