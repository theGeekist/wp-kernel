# Legacy Block Printer Parity

_See [Docs Index](cli-index.md) for navigation._

This note captures the observable behaviour of the legacy block printers that
lived under `packages/cli/src/printers/blocks/**` until the v0.8.0 release. We
retired the string emitters alongside the command shims, but the behaviour
documented here remains a parity checklist for the AST-first builders.

## JS-only printer (`generateJSOnlyBlocks`)

- **Inputs** – consumes the `JSOnlyBlockOptions` shape (IR blocks, project root,
  output directory, optional source string) and immediately filters for blocks
  without `hasRender` before sorting by key.
- **Output file** – always targets `blocks/auto-register.ts` under the provided
  output directory and emits a banner that records the source of truth.
- **Manifest validation** – loads each `block.json`, reporting read/parse
  failures and forwarding structural warnings from
  `validateBlockManifest(manifest, block)`.
- **Stub generation** – when a manifest references `file:` editor or view
  modules (`index.tsx`, `view.ts`) that do not exist, stubs are written alongside
  the manifest.
- **Registration logic** – blocks that still rely on `registerBlockType` calls
  (i.e. no file module handles registration) produce an `import` of their
  manifest JSON and a call to
  `registerBlockType(<metadata>, createGeneratedBlockSettings(<metadata>))`; the
  helper is emitted exactly once when at least one block needs it. Blocks that
  register through file modules skip the import/registration path entirely.
- **Warnings** – all warnings (file I/O failures, validation issues, missing
  stubs) are aggregated so `reportWarnings` can surface them to the reporter
  pipeline.

## SSR printer (`generateSSRBlocks`)

- **Inputs** – consumes `SSRBlockOptions`, filters for `hasRender` blocks, and
  sorts by key.
- **Per-block processing** – reads each manifest, validates it, resolves the
  declared render file or infers a `render.php` fallback, and emits stub content
  when the referenced PHP template is missing.
- **Manifest entries** – stores a POSIX-encoded manifest describing the block
  directory, manifest path, and optional render path. Render paths only appear
  when the callback is file-based; callback strings short-circuit stub creation
  (`render` pointing to a PHP function leaves the manifest entry without a
  render file).
- **Generated files** – writes two shared artefacts when at least one block was
  processed:
    - `build/blocks-manifest.php` exporting the manifest dictionary through a PHP
      `return` statement.
    - `php/Blocks/Register.php` defining a `Register` class inside the project’s
      `Blocks` namespace with helper methods for resolving manifest directories,
      render paths, and stubbing missing templates.
- **Registrar behaviour** – `register()` loads the manifest, iterates entries,
  normalises relative paths, and calls `register_block_type_from_metadata` with
  optional render arguments produced by `build_render_arguments()`. The helper
  renders templates via output buffering and gracefully returns existing block
  content if the PHP template went missing.
- **Warnings** – bubbled for unreadable manifests, invalid JSON, validation
  failures, missing render templates, and stub creation so the CLI reporters can
  surface them.

## Shared helpers (`template-helpers.ts`)

- `generateBlockImportPath` produces a relative path from the auto-register file
  to each `block.json`, ensuring a `./` prefix when the computed path is within
  the same directory tree.
- `formatBlockVariableName` camel-cases `namespace/slug` pairs for use as
  TypeScript identifiers.
- `validateBlockManifest` enforces required metadata (`name`, `title`,
  `category`, icon, editor script) and warns JS-only blocks when no view script
  is defined, enabling the printers to flag issues without aborting generation.

## Coupling with the CLI pipeline

- `emitBlockArtifacts` orchestrated legacy block generation: it prepared the
  `blocks` directory, merged manual and derived JS-only blocks, wrote derived
  manifests, and then invoked the JS-only and SSR printers with the shared
  `PrinterContext`.
- `writeGeneratedFiles` and `reportWarnings` wrapped printer output so files were
  formatted (PHP/TS) and warnings were passed to the active reporter. Any new
  builders must emit equivalent `files`/`warnings` payloads.
- The generation command wired the printer context via `prepareGeneration`,
  which supplied formatting hooks, directory guards, and a `FileWriter` used to
  produce the CLI summary. Block builders replacing the printers must continue
  to call the context’s `writeFile` to keep summaries accurate.
- Until v0.8.0 removed the delegation layer, `packages/cli/src/commands/generate.ts`
  loaded the legacy command at runtime and proxied CLI options. Builders in
  `src/**` therefore had to remain API-compatible with the legacy printers
  until the removal landed.

## Behavioural guardrails to preserve

- POSIX-normalised paths in manifest entries and registrar lookups so PHP code
  remains portable across environments.
- Stub generation for missing `render.php`, `index.tsx`, and `view.ts` files,
  including the specific scaffolded content that onboarding docs reference.
- Warning semantics: recoverable issues must emit reporter warnings instead of
  aborting generation so adapter rollbacks and CLI summaries stay predictable.
