# Adapter Integration (Next Pipeline)

_See [Docs Index](./index.md) for navigation._

**Scope:** This guide documents the adapter surfaces that exist **today** inside the next-generation CLI pipeline (`packages/cli/src/next/**`). String-based printers from the old CLI are referenced only when they help explain future work; adapters should target the AST-first pipeline exclusively.

Adapters currently plug into the next pipeline in two ways:

- **IR-first extensions** that rewrite the intermediate representation (IR) or stage additional files before the core builders run.
- **Workspace helpers** that queue files in a sandbox, guaranteeing nothing touches the project until the pipeline succeeds.

The sections below catalogue what you can rely on right now and describe how we plan to layer the richer “recipe” API on top of this foundation.

---

## 1. Configuration entry points

Projects register adapters in `wpk.config.*` (current filename `kernel.config.ts`, scheduled to be renamed) using the `adapters.extensions` hook (`packages/cli/src/config/types.ts:113-118`):

```ts
import type { KernelConfigV1 } from '@wpkernel/cli';
import { companyTelemetry } from './adapters/company-telemetry';

export const kernelConfig: KernelConfigV1 = {
	version: 1,
	namespace: 'demo-plugin',
	schemas: {},
	resources: {
		/* … */
	},
	adapters: {
		extensions: [companyTelemetry],
	},
};
```

- Each factory receives an `AdapterContext` with the loaded config, reporter, and sanitised namespace (`packages/cli/src/config/types.ts:90-110`).
- The factory returns one extension, multiple extensions, or nothing (to opt out in a given environment).
- Invalid extensions raise a `KernelError('DeveloperError', …)` and abort the run before any files are written (`packages/cli/src/next/runtime/adapterExtensions.ts:100-134`).

> **Illustrative note:** the old CLI exposed `adapters.php` for string printers. The next pipeline prints PHP from AST programs, so adapters should integrate via the AST APIs described below.

---

## 2. Extension lifecycle

The next pipeline wires adapter extensions automatically when `createIr` executes (`packages/cli/src/next/ir/createIr.ts:33-52`):

1. IR fragments run first (meta, schemas, resources, policies, diagnostics).
2. During the `generate` phase the pipeline invokes the adapter extension hook (`packages/cli/src/next/runtime/adapterExtensions.ts:134-170`).
3. Extensions execute serially. Each receives a **cloned** IR snapshot plus a sandbox directory. They may:
    - patch the clone and call `updateIr(nextIr)` so downstream extensions and builders see the change;
    - queue files with `queueFile(filePath, contents)`; files remain in the sandbox until the pipeline succeeds (`packages/cli/src/adapters/extensions.ts:64-120`);
    - write scratch data inside `tempDir` without touching the workspace.
4. When every extension finishes the pipeline either:
    - calls `commit()` to flush the queued files into `.generated/**`, or
    - calls `rollback()` to discard the sandbox if an error occurred.

The workspace writer that persists files is the same transactional layer used by the builders, so adapters gain atomic writes “for free”.

---

## 3. Extension contract

```ts
export interface AdapterExtension {
	name: string; // required, non-empty
	apply(context: AdapterExtensionContext): Promise<void> | void;
}
```

`AdapterExtensionContext` (`packages/cli/src/config/types.ts:90-116`) exposes:

- `ir` – a mutable clone of the IR (`IRv1`).
- `updateIr(nextIr)` – replace the clone that subsequent extensions (and the builders) will consume.
- `outputDir` – absolute path to `.generated/` inside the active workspace.
- `configDirectory` – directory that contains the active `kernel.config.*` file.
- `tempDir` – a sandbox folder dedicated to this extension.
- `queueFile(filePath, contents)` – stage a file for later commit (paths may be absolute or relative to the workspace).
- `formatPhp`, `formatTs` – placeholder formatters (currently pass-through; see §6).
- `reporter` – a child reporter scoped to `adapter` for structured logging.

Any uncaught error is logged and normalised before propagating back to the pipeline (`packages/cli/src/adapters/extensions.ts:129-173`); the sandbox is torn down automatically.

---

## 4. Building adapters today

### 4.1 Prefer IR rewrites

Update the IR so the existing builders can emit the right artefacts:

```ts
import type { AdapterExtension } from '@wpkernel/cli';

export const enforcePolicyFallback: AdapterExtension = {
	name: 'company.policy-fallback',
	apply({ ir, updateIr }) {
		const clone = {
			...ir,
			policyMap: {
				...ir.policyMap,
				fallback: {
					capability: 'manage_options',
					appliesTo: 'resource',
				},
			},
		};

		updateIr(clone);
	},
};
```

`createPhpBuilder` reads the modified policy map and emits the updated helper automatically (`packages/cli/src/next/builders/php/policy.ts:21-110`).

### 4.2 Queue supplemental files

Queue files that are not covered by the stock builders-for example, telemetry manifests:

```ts
export const emitTelemetryManifest: AdapterExtension = {
	name: 'company.telemetry',
	async apply({ queueFile, outputDir }) {
		await queueFile(
			`${outputDir}/telemetry.json`,
			JSON.stringify({ events: [] }, null, 2)
		);
	},
};
```

The sandbox guarantees no files appear in the workspace until `commit()` succeeds (`packages/cli/src/adapters/__tests__/extensions.test.ts:12-94`).

### 4.3 Generate PHP from ASTs

When you need to emit PHP today, build a `PhpProgram` and pretty-print it with the shared driver:

```ts
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import { buildProgram, buildStmtClass } from '@wpkernel/php-json-ast';

export const generateStubController: AdapterExtension = {
	name: 'company.stub-controller',
	async apply({ queueFile, outputDir }) {
		const program = buildProgram([
			buildStmtClass({
				/* … construct AST nodes … */
			}),
		]);

		const printer = buildPhpPrettyPrinter({
			workspace: { root: process.cwd() },
		});

		const target = `${outputDir}/Rest/StubController.php`;
		const { code, ast } = await printer.prettyPrint({
			filePath: target,
			program,
		});

		await queueFile(target, code);
		await queueFile(
			`${target}.ast.json`,
			`${JSON.stringify(ast ?? program, null, 2)}\n`
		);
	},
};
```

This pattern mirrors what the core writer does (`packages/cli/src/next/builders/php/writer.ts:30-68`). Whenever possible, prefer IR rewrites so the built-in helpers continue to guarantee parity.

---

## 5. Logging, testing, and failure handling

- Extensions inherit a child reporter namespaced as `adapter` (`packages/cli/src/next/runtime/adapterExtensions.ts:128-166`); use it for structured logs.
- Unit tests can drive `runAdapterExtensions` directly to validate commit/rollback behaviour (`packages/cli/src/adapters/__tests__/extensions.test.ts:12-213`).
- When an extension throws, the pipeline reports the normalised error and refuses to write any staged files (`packages/cli/src/next/runtime/adapterExtensions.ts:113-166`).

---

## 6. Roadmap (aligned with next/\* workstreams)

The current surface deliberately favours IR rewrites. To deliver the richer DX hinted at in earlier drafts we still need:

1. **Recipe builders on top of `@wpkernel/php-json-ast`.** Once the AST parity plan covers wp-option and transient storage (`packages/cli/docs/php-ast-migration-tasks.md`), expose high-level helpers (permission macros, REST args merges, namespace helpers) that manipulate queued `PhpProgram` payloads.
2. **Formatter plumbing.** `formatPhp`/`formatTs` in the extension context should call the wpk formatter helpers rather than acting as pass-throughs (`packages/cli/src/next/runtime/adapterExtensions.ts:140-152`).
3. **Scaffolding and test tooling.** Future commands like `wpk adapter scaffold`/`test` should target the AST-first builders (no string templates).
4. **Slot documentation.** After the recipe layer lands, auto-generate slot references from the AST helpers to keep documentation accurate.

Until these milestones land, adapters should continue to lean on IR rewrites and staged file emission. The existing pipeline already guarantees deterministic execution, transactional writes, and clear logging-enough to build reliable project-specific extensions today.

---

## 7. Quick reference

| Concern              | What exists today                                               | Location                                                                                          |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Registering adapters | `config.adapters.extensions` (on `KernelConfigV1`)              | `packages/cli/src/config/types.ts:113-118`                                                        |
| Extension execution  | Runs during `generate`, serial order, sandboxed writes          | `packages/cli/src/next/runtime/adapterExtensions.ts:100-170`                                      |
| Updating the IR      | Call `updateIr` inside `apply`                                  | `packages/cli/src/adapters/extensions.ts:64-120`                                                  |
| Staging files        | `queueFile` + sandbox commit                                    | `packages/cli/src/adapters/__tests__/extensions.test.ts`                                          |
| Emitting PHP         | Build `PhpProgram`, pretty-print via `@wpkernel/php-driver`     | `packages/cli/src/next/builders/php/writer.ts:30-68`                                              |
| Future recipe API    | Pending AST parity for wp-option/transient + formatter plumbing | `packages/cli/docs/php-ast-migration-tasks.md`, `packages/cli/docs/pipeline-integration-tasks.md` |

Use this table as a checklist when introducing new adapters or evaluating future work. Each item links directly to the implementation that enforces the behaviour today.
