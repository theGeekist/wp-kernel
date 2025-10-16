# WPK CLI Next-Gen Architecture

Status: draft – capturing direction for the upcoming CLI rewrite before code lands.  
Audience: core contributors building the new `packages/cli/src/next` namespace.

## Objectives

- Preserve the existing IR strengths while making it truly extensible.
- Replace template-driven commands with composable `create*` helpers.
- Separate high-level builder API from low-level drivers (PHP via `nikic/PHP-Parser`, TS via `ts-morph`, git-backed apply, etc.).
- Provide a clean migration path by building everything in a new namespaced surface, leaving current commands untouched until parity is reached.
- Avoid bare “kernel” terminology; use `wpk` or `wpkernel` consistently.

## Problem Context

- See `examples/showcase/SHOWCASE_GENERATED_PROBLEMS.md` for the catalogue of defects in the generated showcase plugin (PHP syntax failures, TS gaps, missing tests). This document exists to address those systemic issues.
- Mirror established WordPress primitives where possible (e.g., surface deprecations via `@wordpress/deprecation`), rather than creating bespoke implementations.

## Existing Foundations to Reuse

- **Core reporter & error types** – `packages/core/src/reporter` already wraps `loglayer` with namespaced reporters; `packages/core/src/error` exposes `KernelError` and structured serialization helpers. The CLI should build on these instead of inventing new logging/error plumbing.
- **Event bus** – `packages/core/src/events` exports the kernel event bus; CLI drivers can emit lifecycle events through the same surface so extensions share semantics with the runtime.
- **Policy/resource contracts** – current IR-producing modules (`packages/core/src/policy`, `resource`, `data`) provide type safety we can import into the new fragments.
- **Gutenberg CLI patterns** – the Gutenberg repo’s `bin/packages` (e.g., `build.mjs`, `dependency-graph.js`) demonstrates CLI ergonomics (chalk, ora spinners, yargs command runners) and deterministic dependency ordering. Where feasible, mirror these conventions so WPK CLI feels native to WordPress tooling.
- **WordPress warnings/deprecations** – packages like `@wordpress/deprecated` and `@wordpress/warning` give us canonical logging behaviour (hooks integrations, deduplication); our reporters should delegate to them for parity.
- **CLI references** – `packages/cli/templates/wordpress-*.templfile` contains read-only copies of Gutenberg’s CLI scripts (`build.mjs`, `dependency-graph.js`, etc.) so we can study WordPress’ workflows even when the symlinked repo isn’t available.

## Proposed Folder Layout (`packages/cli/src/next`)

```
next/
  ir/
    createIr.ts              // orchestrates config -> IR pipeline
    fragments/               // composable helpers (createResources, createSchemas, ...)
    composeIr.ts             // merge / override semantics
  builders/
    createBundler.ts         // rollup-powered scaffolder
    createPhpBuilder.ts      // nikic/PHP-Parser driver
    createTsBuilder.ts       // ts-morph driver
    createPatcher.ts         // git 3-way patch driver
    shared/                  // shared builder helpers (workspace IO, formatting, etc.)
  runtime/
    createPipeline.ts        // orchestrates IR fragments + builders
    types.ts                 // BuilderContext, Fragment, etc.
  extensions/
    createExtension.ts       // helper for third-party integration
  commands/
    init.ts / generate.ts / apply.ts (thin wrappers that instantiate the new pipeline)
  utils/                     // cross-cutting helpers for the new world
```

Mirror the structure under `packages/cli/tests/next/` with unit + integration coverage leveraging the new workspace helpers.

## Foundational Helper Contract

- All fragments/builders derive from a single `createHelper({ ... })` utility that normalises metadata and enforces a shared signature.
- Helper options:
    ```ts
    createHelper({
      key: 'ir.resources.core',     // namespaced identifier
      kind: 'fragment' | 'builder',
      mode: 'extend' | 'override' | 'merge',
      priority?: number,
      dependsOn?: string[],
      apply({ context, input, output, reporter }, next?: () => Promise<void>) { ... },
    });
    ```
- Runtime injects `{ context, input, output, reporter }`:
    - `context` – immutable environment (workspace handle, config paths, helper registry, shared services).
    - `input` – phase-specific payload (e.g., config + current IR for fragments, composed IR for builders).
    - `output` – controlled accumulator/writer (merge IR nodes, queue file writes, emit bundles).
    - `reporter` – namespaced reporter; helpers can call `reporter.child(key)` for sub-sections. Cross-cutting instrumentation (timing, tracing) wraps helpers via the foundational utility.
- `apply` receives an optional `next` function so helpers can wrap composition chains (e.g., `await next()`), enabling `reduceRight`-style pipelines for cross-cutting behaviour.
- Extensions call specialised helpers (e.g., `createResourcesFragment`) that internally delegate to `createHelper`, keeping plumbing consistent and simplifying testing (easy to inject fake `context/input/output`).
- Helper implementations must remain **pure** (no hidden state or side effects outside `output`), avoid nested helper definitions, and favour small, single-purpose functions with low cyclomatic complexity. Shared utilities live alongside helpers in reusable modules.

## IR Extensibility (`createIr`)

- Expected `createIr` result:

    ```ts
    {
      meta: {
        version: 1,
        namespace: string,
        sanitizedNamespace: string,
        sourcePath: string,
        origin: 'typescript' | 'javascript' | 'json',
      },
      schemas: IRSchema[],
      resources: IRResource[],
      policies: IRPolicyHint[],      // collected policy references
      policyMap: IRPolicyMap,        // resolved capabilities + warnings
      blocks: IRBlock[],
      php: {
        namespace: string,
        autoload: string,
        outputDir: string,
      },
      extensions?: Record<string, unknown>, // extension data by namespace
      diagnostics?: IRDiagnostic[],         // optional warnings/errors collected during build
    }
    ```

- `createIr(config, options)` orchestrates a set of fragment helpers. Each fragment receives `(config, ctx)` and returns a partial IR.
- Fragment registration API:
    ```ts
    pipeline.ir.use(
      createResourcesFragment({
        key: 'ir.resources.core',
        mode: 'extend', // extend | override | merge
        dependsOn: ['ir.schemas.core'],
        apply({ context, input, output, reporter }) { ... }
      })
    );
    ```
- Duplicate handling:
    - `extend` (default): append to existing results.
    - `override`: replace previous fragment with the same key (warn if multiple overrides registered).
    - `merge`: deep-merge outputs onto existing data.
- Extensions can add their own config → IR mappings by registering additional fragments. Example:
    ```ts
    pipeline.ir.use(
    	createFooAnalyticsFragment({ key: 'ir.resources.foo.analytics' })
    );
    ```
- `composeIr.ts` owns merge semantics and ensures fragments run in dependency order.

## Builder Runtime (`createPipeline`)

- `const pipeline = createPipeline();`
- API surface:

    ```ts
    pipeline.ir.use(createSchemasFragment());
    pipeline.ir.use(createResourcesFragment());

    pipeline.builders.use(createBundler());
    pipeline.builders.use(createPhpBuilder());
    pipeline.builders.use(createTsBuilder());
    pipeline.builders.use(createPatcher());

    await pipeline.run({
    	phase: 'generate', // init | generate | apply | custom
    	config,
    	workspace, // derived via workspace helpers
    	reporter, // @wpkernel/core reporter
    });
    ```

- Builders are simple factories returning async functions:
    ```ts
    function createPhpBuilder(options?): BuilderFactory {
    	return createHelper({
    		key: 'builder.generate.php.core',
    		kind: 'builder',
    		apply({ context, input, output, reporter }) {
    			// use nikic/PHP-Parser to emit artifacts under .generated/php
    		},
    	});
    }
    ```
- No hidden DSL-if a user wants to write inline drivers they can register a plain async function that follows the `Builder` interface.

## Core Fragment Expectations

- `createMetaFragment` – sanitises namespace, records origin/source path.
- `createSchemasFragment` – loads configured schemas (mirrors `schema.ts`) and pushes sorted entries into `ir.schemas`.
- `createResourcesFragment` – builds resource descriptors (existing logic from `resource-builder.ts`), populates `ir.resources`, and attaches additional metadata required by downstream fragments.
- `createPoliciesFragment` – runs `collectPolicyHints` over resources and writes `ir.policies`.
- `createPolicyMapFragment` – executes logic from `ir/policy-map.ts`:
    - resolves `policyMap` module if present,
    - evaluates capabilities/descriptors,
    - merges with fallback (`manage_options`),
    - records `missing`, `unused`, and warning diagnostics under `ir.policyMap.warnings`,
    - emits warnings into `diagnostics` if critical issues surface.
- `createBlocksFragment` – discovers block metadata (`block-discovery.ts`) and appends to `ir.blocks`.
- `createOrderingFragment` – applies deterministic ordering (logic from `ordering.ts`) across schemas/resources/policies/blocks.
- `createValidationFragment` – runs cross-cutting IR validation rules, appending diagnostics or throwing on fatal errors.

Each fragment is registered via `createHelper` with a unique key (e.g., `ir.policy-map.core`) so extensions can override or augment them.

## Refinement Opportunities

These concepts are only partially (or not at all) present in the current CLI; we should treat them as first-class requirements in the next-gen runtime.

1. **Explicit Step Registry**
    - _Current state_: commands wire helpers manually (e.g., `prepareGeneration` builds a `PrinterContext`, adapters mutate IR, then printers run in sequence). No metadata exists for visualising or reordering steps.
    - _Target_: registering a helper produces a `Step` descriptor `{ key, phase, dependsOn, apply }`. The runtime can enumerate steps, skip them (for debugging), or output dependency graphs. This directly replaces the implicit ordering baked into `emitGeneratedArtifacts` and similar functions.

2. **IR Normalisation Contracts**
    - _Current state_: `IRv1` is stable but undocumented; extensions mutate it freely (see `runAdapterExtensions`).
    - _Target_: document the IR schema alongside version-locked keys vs extension namespaces. The pipeline should expose helpers like `context.ir.schemaVersion` and enforce that extensions only write under `ir.extensions['my.namespace']`.

3. **Error Context Propagation**
    - _Current state_: errors bubble up with ad-hoc wrapping (`AdapterEvaluationError`, `KernelError`), and reporters log generic messages.
    - _Target_: every `apply()` invocation wraps throwables in `{ helper: key, phase, cause, contextFragment }`. Reporters can then emit structured error logs (helper key, phase, stack) making debugging predictable.

4. **Cross-language Driver Bridges**
    - _Current state_: builders talk directly to nikic/ts-morph via bespoke glue (e.g., `emitPhpArtifacts` constructs builders manually).
    - _Target_: surface driver facades (`PhpDriver`, `TsDriver`, etc.) so helpers call `context.drivers.php.compile(...)`. This keeps our internal choices (nikic, ts-morph) swappable and lets community drivers plug in alternate engines.

5. **Testing Guidance**
    - _Current state_: integration tests exist, but there’s no explicit “golden IR” contract.
    - _Target_: document that every new fragment/builder must have:
        - **IR parity tests** – given config X, the next-gen `createIr` output matches the legacy IR byte-for-byte (use the new workspace helpers for fixtures).
        - **Builder parity tests** – generated artifacts from next-gen builders match the legacy printers (optionally via golden file manifests).

## Testing Tooling

Reuse the existing helper suites to implement the parity tests above:

- **`@wpkernel/test-utils/integration`**
    - `withWorkspace` / `createWorkspaceRunner` – create disposable workspaces, preload files, and restore `cwd`.
    - CLI helpers (`packages/test-utils/src/cli`) – memory-backed stdout/stderr for executing `wpk` commands inside tests.
- **`@wpkernel/e2e-utils/integration`**
    - `createIsolatedWorkspace` – full sandbox with pinned `node`/`pnpm` plus `.run()` executor.
    - `createCliRunner` – capture structured transcripts from arbitrary commands.
    - `collectFileManifest`, `createGoldenSnapshot`, `diffGoldenSnapshots` – assert generated output parity.
    - `inspectBundle` – detect bundle regressions (externals, sourcemaps).
    - `fabricateKernelConfig` – synthesise config/policy fixtures.
    - `createEphemeralRegistry` – local npm registry for installing real tarballs in tests.
- **Test-support shims**
    - `withIsolatedWorkspace` / `writeWorkspaceFiles` – Jest-friendly wrappers around the integration helpers.
    - Shared types (`CliTranscript`, `FileManifestDiff`, etc.) – consistent assertion payloads.

## Decisions on Open Questions

1. **Error handling for fragment conflicts**
    - Uniqueness: enforce one `override` per key (throw with registrant origins if violated).
    - Same key + same mode:
        - `override`: error on multiple overrides.
        - `extend`: allow many; append deterministically.
        - `merge`: allow many; deep-merge deterministically.
    - Mixed modes: apply in order `override` → `merge` → `extend` so later modes see prior output.
    - Ordering: topological sort by `dependsOn`, then `priority` (desc), then package name, then registration order.
    - Diagnostics: emit `ConflictDiagnostic { key, modes, origins, resolution }`; support `--strict-conflicts` to fail merges in CI.
    - Ergonomics: expose `pipeline.assertUniqueOverrides(['key'])` for tests.

2. **Helper shortcuts vs explicit registries**
    - Public API stays explicit: `pipeline.ir.use(...)`, `pipeline.builders.use(...)`, `pipeline.extensions.use(...)`.
    - Convenience: `pipeline.use(helper)` only when `helper.kind` is present; otherwise throw.
    - Ergonomics: `pipeline.group('foo', (p) => { ... })` for batching registrations without losing clarity.

3. **Versioning strategy for builders & phases**
    - Capability negotiation over tight coupling: builders declare `requiredCli`, `irRange`, optional `builderApiVersion`.
    - Runtime checks `satisfies(cliApiVersion, requiredCli)` and `satisfies(ir.version, irRange)` on registration.
    - Phases: core `'init' | 'generate' | 'apply'`, plus open-ended `custom:<name>` entries; builders list phases they handle. Unknown phases are skipped.
    - Deprecation: builders call `reporter.deprecate({ since, removeIn, message })`; runtime aggregates and can `--fail-on-deprecation`.

4. **Workspace handle interface**
    - Provide atomic, observable filesystem/git's ops with manifests and dry-run support:
        ```ts
        export interface Workspace {
        	root: string;
        	cwd(): string;
        	read(file: string): Promise<Buffer | null>;
        	readText(file: string): Promise<string | null>;
        	write(
        		file: string,
        		data: Buffer | string,
        		opts?: { mode?: number; ensureDir?: boolean }
        	): Promise<void>;
        	writeJson<T>(
        		file: string,
        		obj: T,
        		opts?: { pretty?: boolean }
        	): Promise<void>;
        	exists(path: string): Promise<boolean>;
        	rm(path: string, opts?: { recursive?: boolean }): Promise<void>;
        	glob(pattern: string | string[]): Promise<string[]>;
        	threeWayMerge(
        		file: string,
        		base: string,
        		current: string,
        		incoming: string,
        		opts?: { markers?: { start: string; mid: string; end: string } }
        	): Promise<'clean' | 'conflict'>;
        	git?: {
        		isRepo(): Promise<boolean>;
        		add(paths: string | string[]): Promise<void>;
        		commit(message: string): Promise<void>;
        		currentBranch(): Promise<string>;
        	};
        	begin(label?: string): void;
        	commit(label?: string): Promise<FileManifest>;
        	rollback(label?: string): Promise<void>;
        	dryRun<T>(
        		fn: () => Promise<T>
        	): Promise<{ result: T; manifest: FileManifest }>;
        	tmpDir(prefix?: string): Promise<string>;
        	resolve(...parts: string[]): string;
        }
        ```
    - Back the implementation with the existing test-utils so parity tests remain simple.

## Core Builders (mapping to the current CLI)

| New Builder                     | Current Implementation Reference                                   |
| ------------------------------- | ------------------------------------------------------------------ |
| `createBundler`                 | `packages/cli/src/commands/init.ts` templates                      |
| `createPhpBuilder`              | `packages/cli/src/printers/php/printer.ts` + sub-printers          |
| `createTsBuilder`               | `packages/cli/src/printers/types` / `ui` / `blocks` pipelines      |
| `createPatcher`                 | `packages/cli/src/commands/apply/apply-generated-php-artifacts.ts` |
| (future) `createGenerateBlocks` | `packages/cli/src/printers/blocks/index.ts`                        |

During the rewrite we can port logic gradually, ensuring tests compare outputs between legacy and next-gen builders until parity is reached.

## Public Extension API Sketch

```ts
import { createPipeline } from '@wpkernel/cli/next/runtime';
import {
	createIr,
	createSchemasFragment,
	createResourcesFragment,
} from '@wpkernel/cli/next/ir';
import { createPhpBuilder } from '@wpkernel/cli/next/builders';
import { createFooExtension } from 'my-wpk-extension';

const pipeline = createPipeline();

pipeline.ir.use(createSchemasFragment());
pipeline.ir.use(createResourcesFragment());

pipeline.extensions.use(createFooExtension()); // registers custom fragments + builders

pipeline.builders.use(createPhpBuilder());

await pipeline.run({ phase: 'generate', config, workspace, reporter });
```

Extensions return objects like:

```ts
export function createFooExtension() {
	return {
		register(pipeline) {
			pipeline.ir.use(
				createFooFragment({ key: 'ir.resources.foo', mode: 'extend' })
			);
			pipeline.builders.use(createFooBuilder());
		},
	};
}
```

## Open Questions

- Error handling strategy for fragment conflicts (warn vs throw).
- Whether we expose helper shortcuts (`pipeline.use(...)`) or stick with explicit `pipeline.ir` / `pipeline.builders`.
- Versioning strategy for builders (e.g., allow future `phase` names without breaking core).
- Interface for the workspace handle (likely wraps the new integration helpers from `@wpkernel/test-utils`).

## Phase One: Foundations

Deliverables:

1. **Scaffold the `next/` namespace** – commit modules for `createHelper`, `createPipeline`, fragment/builder registries, and the workspace abstraction. Use placeholder functions/stubs where implementation is pending (avoid empty/dummy tests that will fail linting).
2. **Port IR fragments** – move current IR logic into helper fragments (`meta`, `schemas`, `resources`, `policies`, `policyMap`, `blocks`, `ordering`, `validation`) wired through `createIr`.
3. **Implement runtime plumbing** – wire `createPipeline` with registries, dependency sorting, conflict diagnostics, and the `apply(next)` composition contract.
4. **Workspace & reporter integration** – surface the new workspace handle backed by `@wpkernel/test-utils` helpers and ensure reporters bridge to `packages/core/src/reporter` + `@wordpress/deprecation`/`warning`.
5. **Builder stubs** – add placeholder builders (`createBundler`, `createPhpBuilder`, `createTsBuilder`, `createPatcher`) that currently no-op but register via the new helper pipeline, ready for incremental implementation.
6. **Golden tests** – introduce parity suites that snapshot legacy IR output and generated artifacts (using the testing tooling above) once implementations exist; until then, favour placeholders over failing smoke tests.
7. **Documentation & ADRs** – codify the helper contract, conflict rules, workspace API, and version-negotiation design (ADR-00X) while updating this doc when gaps are discovered.

Exit criteria:

- `createIr` reproduces current IR byte-for-byte for showcase configs in CI.
- Pipeline graph can enumerate registered steps and highlight conflicts deterministically.
- Workspace dry-run manifests drive the first parity tests for PHP/TS outputs (even if builders still no-op).
- ADR and doc updates reflect any deviations from the plan.

This document will evolve as implementation details solidify-update it alongside ADRs and the new code under `next/`.
