# WPK CLI Next-Gen Architecture

Status: Phase One complete – runtime helpers, workspace drivers, and IR fragments now ship under `packages/cli/src/next`.
Audience: core contributors iterating on the new `packages/cli/src/next` namespace.

## Phase One Deliverables

- **Runtime pipeline** – `runtime/createPipeline.ts` executes registered fragment and builder helpers with dependency-aware ordering and step diagnostics.
- **Helper utilities** – `next/helper.ts` codifies the shared helper signature used by both fragments and builders.
- **Workspace adapter** – `next/workspace/filesystem.ts` provides transactional filesystem utilities, git helpers, and JSON writers reused by builders.
- **IR construction** – `next/ir/createIr.ts` and fragment helpers build the intermediate representation before builders run.
- **Builder surface** – `next/builders/*` exposes PHP, TypeScript, bundler, and patcher builders backed by the shared helper contract.

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

- **Core reporter & error types** – `packages/core/src/reporter` wraps `loglayer`; `packages/core/src/error` exports `KernelError`. The new runtime already consumes these.
- **Event bus** – `packages/core/src/events` powers canonical event hooks. Helpers should emit lifecycle events through the same bus.
- **Policy/resource contracts** – existing IR contracts in `packages/core/src/resource`, `policy`, and `data` back the new fragment helpers.
- **Gutenberg CLI patterns** – Gutenberg’s `bin/packages/*` scripts (copied under `packages/cli/templates/wordpress-*.templfile`) model build ergonomics we can mirror.
- **WordPress warnings/deprecations** – packages like `@wordpress/deprecated` / `@wordpress/warning` provide established logging semantics; our reporters should defer to them where applicable.

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
    pipeline.builders.use(createPhpDriverInstaller());
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
    			// bridged by createPhpDriverInstaller once nikic/PHP-Parser is available
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

## Refinement Opportunities (tracked work items)

1. **Explicit Step Registry (runtime)**
    - _Goal_: expose `pipeline.graph()` output for tooling/visualisation and enforce deterministic ordering (dependsOn → priority → key → registration order).
    - _Status_: adjacency/indegree graph exists internally; expose diagnostics + CLI hook.

2. **IR Normalisation Contracts (docs + enforcement)**
    - _Goal_: document which IR keys are version-locked vs extension-owned and enforce writes under `ir.extensions` for custom data.

3. **Structured Error Propagation**
    - _Goal_: ensure `apply()` wrappers attach `{ helper, phase, cause, context }` metadata before rethrowing, plumbing through reporter output.

4. **Driver Facades**
    - _Goal_: provide `context.drivers.php` / `context.drivers.ts` abstractions so builders don’t reach into implementation details, allowing adapter swapping.

5. **Golden Testing Guidance**
    - _Goal_: codify IR parity + artifact parity requirements in contributor docs and enforce via tests once real builders land.

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

## Phase One: Foundations

Deliverables (tracked independently so cloud agents can contribute without conflict):

1. **Scaffold the `next/` namespace** – committed: helper contract (`helper.ts`), pipeline runtime (`runtime/createPipeline.ts`), IR fragments, workspace abstraction, and smoke tests for helper shapes. (_Status: done_)
2. **Port IR fragments** – fragments under `ir/fragments/*` now recreate `buildIr` behaviour; continue layering diagnostics and extension hooks. (_Status: in progress_)
3. **Runtime plumbing** – dependency graph + conflict diagnostics are live; next iteration exposes a public `pipeline.graph()` for tooling. (_Status: in progress_)
4. **Workspace & reporter integration** – filesystem-backed workspace (`workspace/filesystem.ts`) landed; git helpers + deprecation forwarding still to come. (_Status: in progress_)
5. **Builder stubs** – placeholder builders (`bundler`, `php`, `ts`, `patcher`) register successfully and log debug output. They will be swapped with real drivers in subsequent workstreams. (_Status: done as scaffolds_)
6. **Parity scaffolding** – IR golden tests exist (`ir/__tests__/createIr.test.ts`); artifact parity is deferred until real builders land. (_Status: foundations done_)
7. **Documentation & ADRs** – helper contract and conflict rules documented here; ADR-00X will memorialise the pipeline semantics. (_Status: in progress_)

### Phase One implementation snapshot

The first milestone now lives under `packages/cli/src/next`. The `createHelper` utility standardises helper metadata and powers the new `createPipeline` runtime, which performs dependency-aware ordering, conflict detection, and middleware-style chaining across fragments and builders. Core IR behaviour has been ported into dedicated helpers in `ir/fragments`, and `createIr` composes them to reproduce the legacy IR (`buildIr`) byte-for-byte for the showcase fixtures. Builder surfaces ship as debuggable no-ops so future work can focus on parity without breaking command execution.

Runtime plumbing is exercised through Jest suites in `packages/cli/src/next/**/__tests__`, including a golden test that asserts the next-gen IR matches the existing implementation. The filesystem-backed workspace handle (`createWorkspace`) wraps atomic writes, dry-run manifests, and simple three-way merges so forthcoming builders can queue file operations deterministically. Reporter integration leans on the core `createNoopReporter` until richer transports are wired in.

These foundations unblock follow-on work: parity builders can incrementally land behind the new pipeline while additional diagnostics, ADRs, and documentation flesh out the extension story.

Exit criteria:

- `createIr` reproduces current IR byte-for-byte for showcase configs in CI.
- Pipeline graph can enumerate registered steps and highlight conflicts deterministically.
- Workspace dry-run manifests drive the first parity tests for PHP/TS outputs (even if builders still no-op).
- ADR and doc updates reflect any deviations from the plan.

## Parallel Workstreams (Phase Two & beyond)

Each stream is designed to be tackled independently (ideal for parallel work). When a stream reaches a milestone, update the bullets below with the latest state or follow-up tasks.

1. **PHP driver bridge**
    - _Current_: `createPhpDriverInstaller` installs `nikic/php-parser` via `composer install` when `vendor/autoload.php` is missing (see `packages/cli/src/next/builders/phpDriver.ts`, noop if exist (safe to use); dependency declared in `packages/cli/composer.json`).
    - _Next_: build the JSON ↔ nikic/PHP-Parser bridge for pretty-printing PHP; update this entry once live.
2. **TypeScript driver**
    - _Current_: `createTsBuilder` logs a stub message.
    - _Next_: implement the `ts-morph` builder that emits JS + declaration maps and record progress here.
3. **Bundler evolution**
    - _Current_: `createBundler` placeholder.
    - _Next_: align with `wordpress-build.templfile` (Rollup externals, asset metadata) and note completion in this doc.
4. **Apply driver**
    - _Current_: `createPatcher` stub; workspace merge helpers exist.
    - _Next_: implement git-backed three-way merge + manifest logging and capture status here.
5. **CLI commands**
    - _Current_: legacy `wpk init/generate/apply` only.
    - _Next_: add `wpk create <name>` (positional) that detects the package manager, invokes the init pipeline, and queues an install builder. Update this section when done.
6. **Extensions & tooling**
    - _Goal_: publish extension docs (`pipeline.group`, capability negotiation, workspace contract) plus a sample extension package. Track progress here.
7. **Migration playbook**
    - _Goal_: prepare feature flags, changelog entries, rollout checklist for enabling the next-gen CLI by default. Update as milestones land.

This document will continue to evolve alongside ADRs and the code landing under `packages/cli/src/next`.
