I'm checking for docs in packages/cli/ to find AGENTS or related instructions.

````shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,160p' packages/cli/docs/next-cli.v2.md
# Next CLI - SPRINT NEXT-CORRECT

## Executive Intent

- **WE WANT FEATURE PARITY, NOT IMPLEMENTATION PARITY. THIS IS AN ALPHA BRANCH AND BREAKING CHANGES ARE EXPECTED.**
- V2 abandons every legacy printer contract. Only helper-first, AST-native builders remain. Anything that still expects PHP stri
ngs must migrate or be deleted during the phase it is encountered.
- The migration succeeds only when new helpers compose exactly like `createHelper`-powered modules (`createBundler`, `createTsBu
ilder`) and the pipeline exposes the same public ergonomics with dramatically simpler internals.

## Current State Audit

### PHP builder surface

- `packages/cli/src/next/builders/php/builder.ts` wraps the entire legacy flow inside a single helper. It still hydrates a `Prin
terContext`, recreates the adapter bridge via `ensureAdapterContext`, and never calls `next`, so downstream helpers cannot obser
ve or enrich the generation.
- `packages/cli/src/next/builders/php/domains/context.ts` keeps the adapter customisation shim alive (`context.phpAdapter?.custo
mise`), leaking legacy extension points into the supposedly next-gen branch.
- `packages/cli/src/next/builders/php/domains/index-file.ts` emits raw PHP strings. It cannot be composed or introspected via AS
T and blocks helper-level overrides.

### Writer + bridge

- `packages/cli/src/next/builders/php/domains/writer.ts` still serialises manifests the same way the printer facade did, mutatin
g a legacy `PrinterContext` instead of composing helper actions.
- `packages/cli/src/next/builders/php/bridge.ts` now enforces AST payloads, but every caller assembles the payload manually inst
ead of consuming helper-generated manifests.
- `packages/cli/src/next/runtime/adapterExtensions.ts` carries `formatPhp`/`formatTs` as escape hatches for legacy emitters beca
use the PHP builder cannot yet offer helper-friendly hooks.

### Downstream call sites

- `packages/cli/src/next/ir/createIr.ts` still registers `createPhpBuilder()` as a monolithic helper - it cannot be reordered wi
th future enrichers (e.g., audit logging).
- `packages/cli/src/printers/blocks/**` exports the legacy blocks pipeline. The next branch cannot adopt it until a `createPhpHe
lper` equivalent exists.

### Tests + fixtures

- `packages/cli/src/next/builders/php/domains/__tests__/program-builder.test.ts` enforces `toAst()` parity, anchoring the legacy
 string API in the new helpers.
- `packages/cli/src/next/builders/__tests__/phpBuilder.test.ts` and `.unit.test.ts` mock legacy manifest behaviour, proving the
helper continues to honour old side effects instead of producing a queue of AST actions.

## Root Cause Retrospective

- We tried to migrate incrementally, keeping compatibility shims until each downstream consumer flipped. That preserved `Printer
Context`, adapter customisation, and the string emitters.
- Because every helper wrapped the full transaction, none of the planned `next` composability could land. Observability, logging
, or audits must still patch internal functions instead of stacking helpers.
- Blocks never moved because the PHP surface never presented a clean AST-first helper to wire into; keeping `formatPhp` alive fo
rced the legacy printer tree to survive in the “next” branch.

## Target Architecture (Helper-First)

1. Each PHP artifact is built by a dedicated helper (e.g., `createPhpControllerHelper`, `createPhpPolicyHelper`). They push decl
arative actions (`queuePhpProgram`, `queueManifestCopy`) into `output` and delegate via `next`.
2. A thin orchestration helper (`createPhpBuilder`) simply registers these helpers in order - it does not run IO itself.
3. The writer helper listens for queued PHP actions, shells into the pretty-printer, and persists `{php, ast}` pairs; failures r
oll back queued writes.
4. Blocks and adapter extensions consume the same helper actions, so the IR pipeline can enrich or replace behaviours without to
uching internal functions.

### Helper pipeline pseudo code

```ts
// packages/cli/src/next/builders/php/controller.ts
export function createPhpControllerHelper(definition: ControllerDefinition) {
        return createHelper({
                key: `builder.php.controller.${definition.name}`,
                kind: 'builder',
                async apply(args, next) {
                        args.output.queuePhpProgram({
                                file: resolveControllerPath(definition),
                                program: buildControllerProgram(definition),
                        });
                        return next(args);
                },
        });
}

// packages/cli/src/next/builders/php/index.ts
export function createPhpBuilder() {
        return createHelper({
                key: 'builder.generate.php',
                kind: 'builder',
                async apply(args, next) {
                        const pipeline = args.output.createChannel('php');
                        pipeline.use(createPhpProgramWriter());
                        pipeline.use(
                                createPhpControllerHelper(args.input.ir.php.controllers.base)
                        );
                        pipeline.use(createPhpPolicyHelper(args.input.ir.php.policy));
                        // future enrichers simply pipeline.use(...)
                        return next(args);
                },
        });
}
````

## V2 Migration Phases

Each phase below describes exactly what to change, where, and why. Execute them sequentially. After finishing a phase, fill in t
he matching **Completion Report** entry (see [Reporting Templates](#reporting-templates)).

### Phase 0 - Hard Reset of the PHP builder surface

PLEASE REMEMBER, THIS IS AN ISOLATED BRANCH. **BREAKING CHANGES ARE ENCOURAGED** TO YIELD SIMPLER CLEANER CODE. SPEED IS IMPORTA
NT. JUST DOCUMENT WHAT YOU BROKE AT EACH PHASE SO THE NEXT PHASE CAN ACCOUNT FOR IT

**Goal:** remove every legacy printer construct from the next branch so only helper-first primitives remain. BREAKING CHANGE IS
OKAY.

**Files to change**

- `packages/cli/src/next/builders/php/builder.ts` - delete `PrinterContext` usage, remove `ensureAdapterContext`, and replace th
  e monolithic helper with a lightweight orchestrator that registers phase-specific helpers and invokes `next` immediately.
- `packages/cli/src/next/builders/php/domains/context.ts` - delete the adapter customisation bridge. Any reporting utilities we
  need move into a new `reporting.ts` helper that only exposes pure logging helpers.
- `packages/cli/src/next/builders/php/domains/index-file.ts` - replace string emitters with AST factories (declare/namespace/use
  ). The module should export a helper factory instead of `createPhpIndexFile`.
- `packages/cli/src/next/builders/php/domains/writer.ts` - collapse into a `createPhpProgramWriter` helper that consumes queued
  actions (`PhpProgramAction[]`) and performs IO. Remove `PrinterContext` parameters.
- `packages/cli/src/next/builders/php/program/*` - strip `toAst()` and any legacy-friendly shapes. Only expose builders that ret
  urn `PhpProgram` arrays.
- `packages/cli/src/next/builders/__tests__/phpBuilder*.test.ts` - update to call `pipeline.use(createPhpBuilder())`, assert hel
  per composition via spies on `next`, and drop expectations for legacy manifest writes.
- `packages/cli/src/next/builders/php/domains/__tests__/program-builder.test.ts` - remove string assertions, replace with AST no
  de snapshots.

**Why:** Without this reset later phases cannot compose helpers. The files listed are the only remaining code paths that instant
iate legacy contexts or string emitters.

**Dependencies & tests**

- Update `packages/cli/src/next/builders/index.ts` to re-export the new helper factories.
- Regenerate API docs (`docs/api/generated/@wpkernel/cli/**`) after the helper signature changes.
- Run `pnpm --filter @wpkernel/cli lint --fix`, `typecheck`, `typecheck:tests`, and `test:coverage`.

**Expected outcome:** `createPhpBuilder` becomes a no-op helper that logs the reset, legacy printer orchestration disappears, an
d builds/tests keep passing with PHP emission intentionally disabled.

### Phase 1 - Surface preparation for helper-first domains

**Goal:** decouple domain modules from `PrinterContext` and guarantee that each produces `PhpProgram` ASTs ready for helper comp
osition.

**Files to change**

- Introduce `PhpDomainContext` (via `toPhpDomainContext` in `packages/cli/src/next/builders/php/domains/types.ts`) and update ev
  ery domain module under `packages/cli/src/next/builders/php/domains/**/*.ts` to depend on it instead of `PrinterContext`.
- Ensure domains expose `build*Program` factories (e.g., `buildResourceControllerProgram`) that return `PhpProgram` objects, rep
  lacing string emitters and `appendMethodTemplates` helpers.
- Update `packages/cli/src/next/builders/php/index.ts` (and related barrels) to export the new builders alongside type re-export
  s.
- Remove leftover PrinterContext-only utilities from domains; where context data is required, pull it from `PhpDomainContext`.

**Why:** With pure AST factories and a trimmed context, Phase 2 can wrap domains in helpers without rewriting their internals ag
ain.

**Tests**

- Refresh domain test suites in `packages/cli/src/next/builders/php/domains/__tests__` to assert on AST structure (namespace sta
  tements, docblocks, method signatures) rather than string equality.
- Run `pnpm --filter @wpkernel/cli test` to validate the new expectations.

**Expected outcome:** All PHP domain modules consume `PhpDomainContext`, return `PhpProgram` values, and have AST-based assertio
ns; runtime helper wiring remains unchanged.

### Phase 2 - Helper decomposition of PHP domains

**Goal:** express each artifact as its own helper so future enrichers can compose them.

**Files to change**

- Create `packages/cli/src/next/builders/php/helpers/controller.ts` exporting `createPhpControllerHelper(definition)` that queue
  s controller programs.
- Create `.../helpers/policy.ts`, `.../helpers/persistenceRegistry.ts`, and `.../helpers/indexFile.ts` mirroring the existing do
  mains but returning helpers.
- Update domain modules (`packages/cli/src/next/builders/php/domains/*.ts`) to export pure AST factories (e.g., `buildResourceCo
ntrollerProgram(definition)`), removing IO and helper creation.
- Modify `packages/cli/src/next/builders/php/index.ts` to provide convenient barrels (`export * from './helpers';`).
- Adjust IR factories (`packages/cli/src/next/ir/createIr.ts`) to instantiate these helpers with the relevant IR slices instead
  of expecting global context.

**Why:** This phase enforces createHelper composability. Each artifact becomes a reusable helper and domain modules stop mixing
orchestration with data building.

**Tests**

- Add unit coverage under `packages/cli/src/next/builders/php/helpers/__tests__/*.test.ts` verifying queued actions.
- Update integration coverage in `packages/cli/src/next/builders/__tests__/phpBuilder.test.ts` to inspect queued helper actions
  (e.g., via `output.drainChannel('php')`).

**Expected outcome:** Helpers exist for controllers, policies, persistence registries, and index files; `createPhpBuilder` regis
ters them and queues AST programs via `queuePhpProgram`, while IO is still deferred.

### Phase 3 - Writer channel + pretty-printer integration

PLEASE REMEMBER, THIS IS AN ISOLATED BRANCH. **BREAKING CHANGES ARE ENCOURAGED** TO YIELD SIMPLER CLEANER CODE. SPEED IS IMPORTA
NT. JUST DOCUMENT WHAT YOU BROKE AT EACH PHASE SO THE NEXT PHASE CAN ACCOUNT FOR IT

**Goal:** move IO into a single channel helper so instrumentation/logging helpers can wrap it.

**Files to change**

````

I need to follow Phase1 instructions and review the current code to adapt and update.

```shell
root@9d20af90c396:/workspace/wp-kernel# export CI=1
````

I'll check the domain files to get a better understanding of the types.

```shell
root@9d20af90c396:/workspace/wp-kernel# ls packages/cli/src/next/builders/php
bridge.ts  builder.ts  domains  driver.ts  index.ts  program
```

I need to take a look at the domains now.

```shell
root@9d20af90c396:/workspace/wp-kernel# find packages/cli/src/next/builders/php/domains -maxdepth 2 -type f -print
packages/cli/src/next/builders/php/domains/identity.ts
packages/cli/src/next/builders/php/domains/base-controller.ts
packages/cli/src/next/builders/php/domains/routes.ts
packages/cli/src/next/builders/php/domains/types.ts
packages/cli/src/next/builders/php/domains/wp-post/handlers.ts
packages/cli/src/next/builders/php/domains/wp-post/get.ts
packages/cli/src/next/builders/php/domains/wp-post/identity.ts
packages/cli/src/next/builders/php/domains/wp-post/routes.ts
packages/cli/src/next/builders/php/domains/wp-post/types.ts
packages/cli/src/next/builders/php/domains/wp-post/taxonomies.ts
packages/cli/src/next/builders/php/domains/wp-post/index.ts
packages/cli/src/next/builders/php/domains/wp-post/stub.ts
packages/cli/src/next/builders/php/domains/wp-post/update.ts
packages/cli/src/next/builders/php/domains/wp-post/helpers.ts
packages/cli/src/next/builders/php/domains/wp-post/create.ts
packages/cli/src/next/builders/php/domains/wp-post/meta.ts
packages/cli/src/next/builders/php/domains/wp-post/list.ts
packages/cli/src/next/builders/php/domains/wp-post/context.ts
packages/cli/src/next/builders/php/domains/wp-post/supports.ts
packages/cli/src/next/builders/php/domains/wp-post/delete.ts
packages/cli/src/next/builders/php/domains/wp-option.ts
packages/cli/src/next/builders/php/domains/printer.ts
packages/cli/src/next/builders/php/domains/index-file.ts
packages/cli/src/next/builders/php/domains/transient.ts
packages/cli/src/next/builders/php/domains/resource-controller.ts
packages/cli/src/next/builders/php/domains/wp-taxonomy/handlers.ts
packages/cli/src/next/builders/php/domains/wp-taxonomy/routes.ts
packages/cli/src/next/builders/php/domains/wp-taxonomy/types.ts
packages/cli/src/next/builders/php/domains/wp-taxonomy/index.ts
packages/cli/src/next/builders/php/domains/wp-taxonomy/helpers.ts
packages/cli/src/next/builders/php/domains/wp-taxonomy/context.ts
packages/cli/src/next/builders/php/domains/__tests__/persistence-registry.test.ts
packages/cli/src/next/builders/php/domains/__tests__/base-controller.test.ts
packages/cli/src/next/builders/php/domains/__tests__/writer.test.ts
packages/cli/src/next/builders/php/domains/__tests__/docblock.test.ts
packages/cli/src/next/builders/php/domains/__tests__/value-renderer.test.ts
packages/cli/src/next/builders/php/domains/__tests__/routes.test.ts
packages/cli/src/next/builders/php/domains/__tests__/rest-args.test.ts
packages/cli/src/next/builders/php/domains/__tests__/wp-taxonomy-controller.test.ts
packages/cli/src/next/builders/php/domains/__tests__/transient-controller.test.ts
packages/cli/src/next/builders/php/domains/__tests__/ast-helpers.test.ts
packages/cli/src/next/builders/php/domains/__tests__/wp-option-controller.test.ts
packages/cli/src/next/builders/php/domains/__tests__/template.test.ts
packages/cli/src/next/builders/php/domains/__tests__/resource-controller.test.ts
packages/cli/src/next/builders/php/domains/__tests__/index-file.test.ts
packages/cli/src/next/builders/php/domains/__tests__/program-builder.test.ts
packages/cli/src/next/builders/php/domains/__tests__/ast-schema.test.ts
packages/cli/src/next/builders/php/domains/test-utils/wp-post.ts
packages/cli/src/next/builders/php/domains/rest-args.ts
packages/cli/src/next/builders/php/domains/render.ts
packages/cli/src/next/builders/php/domains/persistence-registry.ts
packages/cli/src/next/builders/php/domains/policy-helper.ts
packages/cli/src/next/builders/php/domains/context.ts
packages/cli/src/next/builders/php/domains/__fixtures__/sample-function-ast.ts
packages/cli/src/next/builders/php/domains/writer.ts
```

I need instructions for the affected files, like tests. I'll update to PhpDomainContext and check types.ts.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,160p' packages/cli/src/next/builders/php/domains/types.ts
import type {
        AdapterContext,
        PhpAdapterConfig,
} from '../../../../config/types';
import type { IRv1 } from '../../../../ir';
import type { PhpJsonAst } from '../program/types';

export type {
        PhpAstBuilder,
        PhpFileMetadata,
        PhpJsonAst,
        PhpJsonNode,
        PhpProgram,
        PhpStmt,
} from '@wpkernel/cli/next/builders/php';

export interface PrinterContext {
        ir: IRv1;
        outputDir: string;
        configDirectory?: string;
        formatPhp: (filePath: string, contents: string) => Promise<string>;
        formatTs: (filePath: string, contents: string) => Promise<string>;
        writeFile: (filePath: string, contents: string) => Promise<void>;
        ensureDirectory: (directoryPath: string) => Promise<void>;
        phpAdapter?: PhpAdapterConfig;
        phpDriver?: {
                prettyPrint: (
                        options: PhpPrettyPrintOptions
                ) => Promise<PhpPrettyPrintResult>;
        };
        adapterContext?: AdapterContext & { ir: IRv1 };
}

export interface PhpPrettyPrintOptions {
        filePath: string;
        ast: PhpJsonAst;
}

export interface PhpPrettyPrintResult {
        code: string;
        ast: PhpJsonAst;
}

export interface PhpDomainContext {
        readonly ir: IRv1;
        readonly namespaceRoot: string;
}

export function toPhpDomainContext(context: PrinterContext): PhpDomainContext {
        return {
                ir: context.ir,
                namespaceRoot: context.ir.php.namespace,
        };
}
```

I see the new context isn't used in many domains-I'll need to update that.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "PrinterContext" packages/cli/src/next/builders/php/domains
packages/cli/src/next/builders/php/domains/writer.ts
6:import type { PrinterContext } from './types';
13:     context: PrinterContext

packages/cli/src/next/builders/php/domains/context.ts
4:import type { PrinterContext } from './types';
7:      context: PrinterContext
8:): AdapterContext & { ir: PrinterContext['ir'] } {
11:                     ir: PrinterContext['ir'];
30:             ir: PrinterContext['ir'];

packages/cli/src/next/builders/php/domains/transient.ts
2:import type { PrinterContext } from './types';
31:     context: PrinterContext;
45:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/policy-helper.ts
1:import type { PrinterContext } from './types';
15:     context: PrinterContext
80:function buildPolicyMap(context: PrinterContext): Record<string, unknown> {

packages/cli/src/next/builders/php/domains/index-file.ts
2:import type { PrinterContext } from './types';
15:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/persistence-registry.ts
11:import type { PrinterContext } from './types';
15:     context: PrinterContext
48:     context: PrinterContext

packages/cli/src/next/builders/php/domains/printer.ts
2:import type { PrinterContext } from './types';
12:export async function emitPhpArtifacts(context: PrinterContext): Promise<void> {

packages/cli/src/next/builders/php/domains/wp-option.ts
2:import type { PrinterContext } from './types';
34:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/test-utils/wp-post.ts
1:import type { PrinterContext } from '../types';
15:export function createPrinterContext(): PrinterContext {
34:     } as unknown as PrinterContext;
39:     context: PrinterContext
50:function inferMethodName(route: IRRoute, context: PrinterContext): string {

packages/cli/src/next/builders/php/domains/__tests__/index-file.test.ts
2:import type { PrinterContext } from '../../types';
46:                     context: createPrinterContext(),
67:function createPrinterContext(): PrinterContext {
91:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/resource-controller.test.ts
2:import type { PrinterContext } from '../../types';
9:              const context = createPrinterContext();
36:function createPrinterContext(): PrinterContext {
69:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/wp-option-controller.test.ts
4:import type { PrinterContext } from '../../types';
50:             const context = createPrinterContext();
77:function createPrinterContext(): PrinterContext {
96:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/transient-controller.test.ts
4:import type { PrinterContext } from '../../types';
47:             const context = createPrinterContext();
74:function createPrinterContext(): PrinterContext {
93:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/wp-taxonomy-controller.test.ts
4:import type { PrinterContext } from '../../types';
64:             const context = createPrinterContext();
98:function createPrinterContext(): PrinterContext {
117:    } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/routes.test.ts
2:import type { PrinterContext } from '../../types';
7:      const context = createPrinterContext();
63:function createPrinterContext(): PrinterContext {
87:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/wp-post/identity-behaviour.test.ts
5:      createPrinterContext,
59:             const context = createPrinterContext();
132:            const context = createPrinterContext();
199:            const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/stub-handlers.test.ts
5:      createPrinterContext,
37:             const context = createPrinterContext();
108:            const context = createPrinterContext();
179:            const context = createPrinterContext();
231:            const context = createPrinterContext();
270:            const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/route-classification.test.ts
5:      createPrinterContext,
50:             const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/meta-handling.test.ts
5:      createPrinterContext,
69:             const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/basic-controller.test.ts
5:      createPrinterContext,
77:             const context = createPrinterContext();
132:            const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/writer.test.ts
8:import type { PrinterContext } from '../../types';
18:                                             NonNullable<PrinterContext['phpDriver']>
97:                     NonNullable<PrinterContext['phpDriver']>
101:    context: PrinterContext;
112:    const context: PrinterContext = {
120:            } as unknown as PrinterContext['ir'],
130:    } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/base-controller.test.ts
2:import type { PrinterContext } from '../../types';
12:             const context = createPrinterContext();
48:function createPrinterContext(): PrinterContext {
72:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/persistence-registry.test.ts
2:import type { PrinterContext } from '../../types';
9:              const context = createPrinterContext();
24:function createPrinterContext(): PrinterContext {
64:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/wp-taxonomy/context.ts
1:import type { PrinterContext } from '../types';
17:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/wp-taxonomy/index.ts
2:import type { PrinterContext } from '../types';
12:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/resource-controller.ts
12:import type { PrinterContext } from './types';
26:     context: PrinterContext

packages/cli/src/next/builders/php/domains/base-controller.ts
14:import type { PrinterContext } from './types';
18:     context: PrinterContext

packages/cli/src/next/builders/php/domains/routes.ts
3:import type { PrinterContext } from './types';
18:     context: PrinterContext;
74:     context: PrinterContext
105:    context: PrinterContext;
184:    context: PrinterContext

packages/cli/src/next/builders/php/domains/types.ts
17:export interface PrinterContext {
49:export function toPhpDomainContext(context: PrinterContext): PhpDomainContext {

packages/cli/src/next/builders/php/domains/wp-post/context.ts
1:import type { PrinterContext } from '../types';
21:     context: PrinterContext;
38:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/wp-post/index.ts
2:import type { PrinterContext } from '../types';
12:     context: PrinterContext;
```

I’ll refactor to PhpDomainContext and update tests to match. I’ll inspect modules and functions.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/domains/resource-controller.ts
import {
        createPhpFileBuilder,
        type PhpFileBuilder,
        appendMethodTemplates,
        appendGeneratedFileDocblock,
        createMethodTemplate,
        PHP_INDENT,
        toPascalCase,
        escapeSingleQuotes,
        renderPhpReturn,
} from '@wpkernel/cli/next/builders/php';
import type { PrinterContext } from './types';
import type { IRResource, IRRoute } from '../../../../ir';
import { buildRestArgsPayload } from './rest-args';
import { createRouteHandlers } from './routes';

export interface ResourceControllerArtifact {
        builder: PhpFileBuilder;
        className: string;
}

export function createResourceControllerArtifact(
        namespaceRoot: string,
        resource: IRResource,
        routes: IRRoute[],
        context: PrinterContext
): ResourceControllerArtifact {
        const builder = createPhpFileBuilder(`${namespaceRoot}\\Rest`, {
                kind: 'resource-controller',
                name: resource.name,
        });

        appendGeneratedFileDocblock(builder, [
                `Source: ${context.ir.meta.origin} → resources.${resource.name}`,
                `Schema: ${resource.schemaKey} (${resource.schemaProvenance})`,
                ...routes.map((route) => `Route: [${route.method}] ${route.path}`),
        ]);

        builder.addUse(`${namespaceRoot}\\Policy\\Policy`);

        const className = `${toPascalCase(resource.name)}Controller`;
        builder.appendStatement(`class ${className} extends BaseController`);
        builder.appendStatement('{');

        const schema = context.ir.schemas.find(
                (entry) => entry.key === resource.schemaKey
        );

        const methods: string[][] = [
                createMethodTemplate({
                        signature: 'public function get_resource_name(): string',
                        indentLevel: 1,
                        indentUnit: PHP_INDENT,
                        body: (body) => {
                                body.line(`return '${escapeSingleQuotes(resource.name)}';`);
                        },
                }),
                createMethodTemplate({
                        signature: 'public function get_schema_key(): string',
                        indentLevel: 1,
                        indentUnit: PHP_INDENT,
                        body: (body) => {
                                body.line(
                                        `return '${escapeSingleQuotes(resource.schemaKey)}';`
                                );
                        },
                }),
                createMethodTemplate({
                        signature: 'public function get_rest_args(): array',
                        indentLevel: 1,
                        indentUnit: PHP_INDENT,
                        body: (body) => {
                                const restArgs = buildRestArgsPayload(schema, resource);
                                if (Object.keys(restArgs).length === 0) {
                                        body.line('return [];');
                                        return;
                                }

                                const payloadLines = renderPhpReturn(restArgs, 2);
                                payloadLines.forEach((line) => body.raw(line));
                        },
                }),
        ];

        const routeMethods = createRouteHandlers({
                builder,
                context,
                resource,
                routes,
        });

        methods.push(...routeMethods);

        appendMethodTemplates(builder, methods);
        builder.appendStatement('}');

        return { builder, className };
}
```

I need to inspect `@wpkernel/cli/next/builders/php` to understand how to convert to AST.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/index.ts
export { createPhpBuilder } from './builder';
export { createPhpPrettyPrinter } from './bridge';
export { createPhpDriverInstaller } from './driver';

export * from './program';
```

I need to export the new domain builder types after inspecting program types.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/program/types.ts
import type { PhpNode, PhpProgram, PhpStmt } from './nodes';

export interface PhpFileMetadata {
        kind:
                | 'base-controller'
                | 'resource-controller'
                | 'persistence-registry'
                | 'block-manifest'
                | 'block-registrar'
                | 'policy-helper';
        name?: string;
}

export interface PhpAstBuilder {
        getNamespace: () => string;
        setNamespace: (namespace: string) => void;
        addUse: (statement: string) => void;
        appendDocblock: (line: string) => void;
        appendStatement: (statement: string) => void;
        appendProgramStatement: (statement: PhpStmt) => void;
        getStatements: () => readonly string[];
        getMetadata: () => PhpFileMetadata;
        getProgramAst: () => PhpProgram;
}

export type PhpJsonNode = PhpNode;

export type PhpJsonAst = PhpProgram;
```

I'm checking out the nodes to see what's going on with them.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/program/nodes.ts
/**
 * Canonical PHP AST types for JSON serialisation.
 *
 * This mirrors the structure emitted by `nikic/PHP-Parser` when hydrated via
 * `JsonSerializable`. Refer to packages/cli/docs/php-json-schema.md for the
 * authoritative schema. Generated definitions can be cross-checked against the
 * upstream PHP implementation at
 * `packages/cli/vendor/nikic/php-parser/lib/PhpParser`.
 *
 * Builders should construct these nodes so we can persist
 * deterministic `.ast.json` artefacts without re-parsing generated PHP source.
 */

export type PhpAttributes = Readonly<Record<string, unknown>>;

const EMPTY_ATTRIBUTES: PhpAttributes = Object.freeze({});

export interface PhpCommentLocation {
        readonly line?: number;
        readonly filePos?: number;
        readonly tokenPos?: number;
        readonly endLine?: number;
        readonly endFilePos?: number;
        readonly endTokenPos?: number;
}

export interface PhpComment extends PhpCommentLocation {
        readonly nodeType: 'Comment' | `Comment_${string}`;
        readonly text: string;
}

export type PhpDocComment = PhpComment & { readonly nodeType: 'Comment_Doc' };

export function createComment(
        text: string,
        location: PhpCommentLocation = {}
): PhpComment {
        return {
                nodeType: 'Comment',
                text,
                ...location,
        };
}

function normaliseAttributes(attributes?: PhpAttributes): PhpAttributes {
        if (!attributes) {
                return EMPTY_ATTRIBUTES;
        }

        if (attributes === EMPTY_ATTRIBUTES) {
                return attributes;
        }

        const keys = Object.keys(attributes);
        return keys.length === 0 ? EMPTY_ATTRIBUTES : { ...attributes };
}

export interface PhpNode {
        readonly nodeType: string;
        readonly attributes: PhpAttributes;
}

export interface PhpIdentifier extends PhpNode {
        readonly nodeType: 'Identifier';
        readonly name: string;
}

export interface PhpName extends PhpNode {
        readonly nodeType: 'Name' | 'Name_FullyQualified' | 'Name_Relative';
        readonly parts: string[];
}

export interface PhpNullableType extends PhpNode {
        readonly nodeType: 'NullableType';
        readonly type: PhpType;
}

export interface PhpUnionType extends PhpNode {
        readonly nodeType: 'UnionType';
        readonly types: PhpType[];
}

export interface PhpIntersectionType extends PhpNode {
        readonly nodeType: 'IntersectionType';
        readonly types: PhpType[];
}

export type PhpType =
        | PhpIdentifier
        | PhpName
        | PhpNullableType
        | PhpUnionType
        | PhpIntersectionType;

export interface PhpAttrGroup extends PhpNode {
        readonly nodeType: 'AttributeGroup';
        readonly attrs: PhpAttribute[];
}

export interface PhpAttribute extends PhpNode {
        readonly nodeType: 'Attribute';
        readonly name: PhpName | PhpIdentifier;
        readonly args: PhpArg[];
}

export interface PhpArg extends PhpNode {
        readonly nodeType: 'Arg';
        readonly value: PhpExpr;
        readonly byRef: boolean;
        readonly unpack: boolean;
        readonly name: PhpIdentifier | null;
}

export interface PhpParam extends PhpNode {
        readonly nodeType: 'Param';
        readonly type: PhpType | null;
        readonly byRef: boolean;
        readonly variadic: boolean;
        readonly var: PhpExpr;
        readonly default: PhpExpr | null;
        readonly flags: number;
        readonly attrGroups: PhpAttrGroup[];
}

export interface PhpStmtBase extends PhpNode {
        readonly nodeType: `Stmt_${string}`;
}

export interface PhpStmtNamespace extends PhpStmtBase {
        readonly nodeType: 'Stmt_Namespace';
        readonly name: PhpName | null;
        readonly stmts: PhpStmt[];
}

export interface PhpStmtUse extends PhpStmtBase {
        readonly nodeType: 'Stmt_Use';
        readonly type: number;
        readonly uses: PhpStmtUseUse[];
}

export interface PhpStmtUseUse extends PhpStmtBase {
        readonly nodeType: 'Stmt_UseUse';
        readonly name: PhpName;
        readonly alias: PhpIdentifier | null;
}

export interface PhpStmtClass extends PhpStmtBase {
        readonly nodeType: 'Stmt_Class';
        readonly name: PhpIdentifier | null;
        readonly flags: number;
        readonly extends: PhpName | null;
        readonly implements: PhpName[];
        readonly stmts: PhpClassStmt[];
        readonly attrGroups: PhpAttrGroup[];
        readonly namespacedName: PhpName | null;
}

export interface PhpStmtTraitUse extends PhpStmtBase {
        readonly nodeType: 'Stmt_TraitUse';
        readonly traits: PhpName[];
        readonly adaptations: PhpNode[];
}

export interface PhpStmtClassConst extends PhpStmtBase {
        readonly nodeType: 'Stmt_ClassConst';
        readonly flags: number;
        readonly consts: PhpConst[];
        readonly attrGroups: PhpAttrGroup[];
}

export interface PhpConst extends PhpNode {
        readonly nodeType: 'Const';
        readonly name: PhpIdentifier;
        readonly value: PhpExpr;
}

export interface PhpStmtProperty extends PhpStmtBase {
        readonly nodeType: 'Stmt_Property';
        readonly flags: number;
        readonly type: PhpType | null;
        readonly props: PhpStmtPropertyProperty[];
        readonly attrGroups: PhpAttrGroup[];
}

export interface PhpStmtPropertyProperty extends PhpStmtBase {
        readonly nodeType: 'Stmt_PropertyProperty';
        readonly name: PhpIdentifier;
        readonly default: PhpExpr | null;
}

export interface PhpStmtClassMethod extends PhpStmtBase {
        readonly nodeType: 'Stmt_ClassMethod';
        readonly name: PhpIdentifier;
        readonly byRef: boolean;
        readonly flags: number;
        readonly params: PhpParam[];
        readonly returnType: PhpType | null;
        readonly stmts: PhpStmt[] | null;
        readonly attrGroups: PhpAttrGroup[];
}
```

I’ll look into builder create functions and check `render.ts` for AST helpers.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/domains/base-controller.ts
import {
        createPhpFileBuilder,
        type PhpFileBuilder,
        appendClassTemplate,
        appendGeneratedFileDocblock,
        createIdentifier,
        createClassTemplate,
        createMethodTemplate,
        PHP_INDENT,
        createPhpReturn,
        PHP_CLASS_MODIFIER_ABSTRACT,
        PHP_METHOD_MODIFIER_PUBLIC,
} from '@wpkernel/cli/next/builders/php';
import type { PrinterContext } from './types';

export function createBaseControllerBuilder(
        namespaceRoot: string,
        context: PrinterContext
): PhpFileBuilder {
        const builder = createPhpFileBuilder(`${namespaceRoot}\\Rest`, {
                kind: 'base-controller',
        });

        appendGeneratedFileDocblock(builder, [
                `Source: ${context.ir.meta.origin} → resources (namespace: ${context.ir.meta.sanitizedNamespace})`,
        ]);

        const methods = [
                createMethodTemplate({
                        signature: 'public function get_namespace(): string',
                        indentLevel: 1,
                        indentUnit: PHP_INDENT,
                        ast: {
                                flags: PHP_METHOD_MODIFIER_PUBLIC,
                                returnType: createIdentifier('string'),
                        },
                        body: (body) => {
                                body.statement(
                                        createPhpReturn(context.ir.meta.sanitizedNamespace, 2)
                                );
                        },
                }),
        ];

        const classTemplate = createClassTemplate({
                name: 'BaseController',
                flags: PHP_CLASS_MODIFIER_ABSTRACT,
                methods,
        });

        appendClassTemplate(builder, classTemplate);

        return builder;
}
```

I need to look at `createPhpFileBuilder` and understand how it converts to AST.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/program/builder.ts
sed: can't read packages/cli/src/next/builders/php/program/builder.ts: No such file or directory
```

I need to check the directories now to see what's inside.

```shell
root@9d20af90c396:/workspace/wp-kernel# ls packages/cli/src/next/builders/php/program
append.ts     docblocks.ts  modifiers.ts  printables.ts      templates.ts  utils.ts
constants.ts  index.ts      nodes.ts      programBuilder.ts  types.ts      valueRenderers.ts

root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/program/programBuilder.ts
import {
        createComment,
        createDeclare,
        createDeclareItem,
        createDocComment,
        createFullyQualifiedName,
        createIdentifier,
        createName,
        createNamespace,
        createScalarInt,
        createStmtNop,
        createUse,
        createUseUse,
        type PhpProgram,
        type PhpStmt,
} from './nodes';
import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from './constants';
import type { PhpAstBuilder, PhpFileMetadata } from './types';

interface ProgramUse {
        readonly key: string;
        readonly parts: readonly string[];
        readonly alias: string | null;
        readonly type: number;
        readonly fullyQualified: boolean;
}

type UseKind = 'normal' | 'function' | 'const';

const USE_KIND_TO_TYPE: Record<UseKind, number> = {
        normal: 1,
        function: 2,
        const: 3,
};

function normaliseNamespace(namespace: string): readonly string[] {
        return namespace
                .split('\\')
                .map((part) => part.trim())
                .filter((part) => part.length > 0);
}

function formatNamespace(parts: readonly string[]): string {
        return parts.join('\\');
}

function normaliseUse(
        statement: string,
        options: { alias?: string | null; kind?: UseKind } = {}
): ProgramUse | null {
        const trimmed = statement.trim();
        if (trimmed.length === 0) {
                return null;
        }

        const { declaration, kind } = extractUseKind(trimmed, options.kind);
        const { namespace, alias } = extractAlias(
                declaration,
                options.alias ?? null
        );
        const fullyQualified = namespace.startsWith('\\');

        const parts = namespace
                .split('\\')
                .map((part) => part.trim())
                .filter((part) => part.length > 0);

        if (parts.length === 0) {
                return null;
        }

        const key = `${USE_KIND_TO_TYPE[kind]}:${parts.join('\\')}::${alias ?? ''}`;

        return {
                key,
                parts,
                alias,
                type: USE_KIND_TO_TYPE[kind],
                fullyQualified,
        };
}

function extractUseKind(
        value: string,
        overrideKind?: UseKind
): {
        declaration: string;
        kind: UseKind;
} {
        const lower = value.toLowerCase();
        if (lower.startsWith('function ')) {
                return {
                        declaration: value.slice('function '.length),
                        kind: 'function',
                };
        }

        if (lower.startsWith('const ')) {
                return {
                        declaration: value.slice('const '.length),
                        kind: 'const',
                };
        }

        return {
                declaration: value,
                kind: overrideKind ?? 'normal',
        };
}

function extractAlias(
        value: string,
        providedAlias: string | null
): {
        namespace: string;
        alias: string | null;
} {
        if (providedAlias) {
                return {
                        namespace: value.trim(),
                        alias: providedAlias.trim(),
                };
        }

        const aliasMatch = value.match(/^(.*)\s+as\s+(.+)$/iu);
        if (!aliasMatch) {
                return {
                        namespace: value.trim(),
                        alias: null,
                };
        }

        const [, capturedNamespace, capturedAlias] = aliasMatch;
        return {
                namespace: capturedNamespace!.trim(),
                alias: capturedAlias!.trim(),
        };
}

function createUseString(entry: ProgramUse): string {
        let prefix = '';
        if (entry.type === USE_KIND_TO_TYPE.function) {
                prefix = 'function ';
        } else if (entry.type === USE_KIND_TO_TYPE.const) {
                prefix = 'const ';
        }

        const aliasSuffix = entry.alias ? ` as ${entry.alias}` : '';
        const base = `${entry.fullyQualified ? '\\' : ''}${entry.parts.join('\\')}`;

        return `${prefix}${base}${aliasSuffix}`;
}

export function createPhpProgramBuilder(namespace: string): PhpProgramBuilder {
        return new PhpProgramBuilder(namespace);
}

export class PhpProgramBuilder {
        private namespaceParts: readonly string[];

        private readonly docblockLines: string[] = [];

        private readonly uses = new Map<string, ProgramUse>();

        private readonly statements: PhpStmt[] = [];

        public constructor(namespace: string) {
                this.namespaceParts = normaliseNamespace(namespace);
        }

        public getNamespace(): string {
                return formatNamespace(this.namespaceParts);
        }

        public setNamespace(namespace: string): void {
                this.namespaceParts = normaliseNamespace(namespace);
        }

        public appendDocblock(line: string): void {
                this.docblockLines.push(line);
        }

        public getDocblock(): readonly string[] {
                return [...this.docblockLines];
        }

        public addUse(
                statement: string,
                options: { alias?: string | null; kind?: UseKind } = {}
        ): void {
                const parsed = normaliseUse(statement, options);
                if (!parsed) {
                        return;
                }

                this.uses.set(parsed.key, parsed);
        }

        public getUses(): readonly string[] {
                return this.getSortedUses().map(createUseString);
```

I need to confirm that domain modules are correctly returning PhpProgram ASTs, not builders.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "createPhpFileBuilder" -n packages/cli/src/next/builders/php -g"*.ts"
packages/cli/src/next/builders/php/domains/policy-helper.ts
3:      createPhpFileBuilder,
17:     const builder = createPhpFileBuilder(`${namespaceRoot}\\Policy`, {

packages/cli/src/next/builders/php/domains/persistence-registry.ts
2:      createPhpFileBuilder,
17:     const builder = createPhpFileBuilder(`${namespaceRoot}\\Registration`, {

packages/cli/src/next/builders/php/domains/__tests__/program-builder.test.ts
2:      createPhpFileBuilder,
116:            const builder = createPhpFileBuilder('Demo\\Plugin\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/wp-option-controller.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
8:              const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/transient-controller.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
8:              const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/wp-taxonomy-controller.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
8:              const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/routes.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
10:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/wp-post/identity-behaviour.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
12:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
81:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
153:            const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/base-controller.ts
2:      createPhpFileBuilder,
20:     const builder = createPhpFileBuilder(`${namespaceRoot}\\Rest`, {

packages/cli/src/next/builders/php/domains/__tests__/wp-post/stub-handlers.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
12:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
65:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
130:            const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
209:            const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
246:            const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/wp-post/route-classification.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
12:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/wp-post/meta-handling.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
12:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/wp-post/basic-controller.test.ts
1:import { createPhpFileBuilder } from '@wpkernel/cli/next/builders/php';
12:             const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {
121:            const builder = createPhpFileBuilder('Demo\\Namespace\\Rest', {

packages/cli/src/next/builders/php/domains/__tests__/writer.test.ts
4:      createPhpFileBuilder,
81:     const builder = createPhpFileBuilder('Demo\\Rest', {

packages/cli/src/next/builders/php/program/programBuilder.ts
348:export function createPhpFileBuilder(

packages/cli/src/next/builders/php/domains/resource-controller.ts
2:      createPhpFileBuilder,
28:     const builder = createPhpFileBuilder(`${namespaceRoot}\\Rest`, {
```

I need to inspect the `createPhpFileBuilder` function in `programBuilder.ts`.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "export function createPhpFileBuilder" -n packages/cli/src/next/builders/php/program/
programBuilder.ts
348:export function createPhpFileBuilder(

root@9d20af90c396:/workspace/wp-kernel# sed -n '340,520p' packages/cli/src/next/builders/php/program/programBuilder.ts
                        namespace: this.program.getNamespace(),
                        docblock: [...this.program.getDocblock()],
                        uses: [...this.program.getUses()],
                        statements: [...this.legacyStatements],
                };
        }
}

export function createPhpFileBuilder(
        namespace: string,
        metadata: PhpFileMetadata
): PhpFileBuilder {
        return new PhpFileBuilder(namespace, metadata);
}
```

I'll check out the `PhpFileBuilder` class earlier in this file. Let's look for it.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "class PhpFileBuilder" -n packages/cli/src/next/builders/php/program/programBuilder.t
s
290:export class PhpFileBuilder implements PhpAstBuilder {

root@9d20af90c396:/workspace/wp-kernel# sed -n '240,340p' packages/cli/src/next/builders/php/program/programBuilder.ts
                }

                const beginGuard = createStmtNop({
                        comments: [createComment(`// ${AUTO_GUARD_BEGIN}`)],
                });
                namespaceStatements.push(beginGuard);

                namespaceStatements.push(...this.statements);

                const endGuard = createStmtNop({
                        comments: [createComment(`// ${AUTO_GUARD_END}`)],
                });
                namespaceStatements.push(endGuard);

                const namespaceNode = createNamespace(
                        namespaceName,
                        namespaceStatements,
                        namespaceAttributes
                );
                program.push(namespaceNode);

                return program;
        }

        private getSortedUses(): readonly ProgramUse[] {
                return Array.from(this.uses.values()).sort((a, b) => {
                        if (a.key === b.key) {
                                return 0;
                        }

                        return a.key < b.key ? -1 : 1;
                });
        }
}

function createNamespaceName(
        parts: readonly string[]
): ReturnType<typeof createName> {
        return createName([...parts]);
}

type LegacyPhpFileAst = {
        namespace: string;
        docblock: string[];
        uses: string[];
        statements: string[];
};

export type PhpFileAst = LegacyPhpFileAst;

export class PhpFileBuilder implements PhpAstBuilder {
        private readonly program: PhpProgramBuilder;

        private readonly metadata: PhpFileMetadata;

        private readonly legacyStatements: string[] = [];

        public constructor(namespace: string, metadata: PhpFileMetadata) {
                this.program = new PhpProgramBuilder(namespace);
                this.metadata = metadata;
        }

        public getNamespace(): string {
                return this.program.getNamespace();
        }

        public setNamespace(namespace: string): void {
                this.program.setNamespace(namespace);
        }

        public addUse(statement: string): void {
                this.program.addUse(statement);
        }

        public appendDocblock(line: string): void {
                this.program.appendDocblock(line);
        }

        public appendStatement(statement: string): void {
                this.legacyStatements.push(statement);
        }

        public appendProgramStatement(statement: PhpStmt): void {
                this.program.appendStatement(statement);
        }

        public getStatements(): readonly string[] {
                return [...this.legacyStatements];
        }

        public getMetadata(): PhpFileMetadata {
                return this.metadata;
        }

        public getProgramAst(): PhpProgram {
                return this.program.toProgram();
        }

        public toAst(): PhpFileAst {
                return {
                        namespace: this.program.getNamespace(),
```

I need to shift from string builders to `PhpProgram`. I'll update context usage and ensure AST conversion.
I'll review other modules to check if any return a program for reference.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "build.*Program" packages/cli/src/next/builders/php/domains -g"*.ts"
packages/cli/src/next/builders/php/domains/writer.ts
21:     const program = builder.getProgramAst();

packages/cli/src/next/builders/php/domains/__tests__/program-builder.test.ts
13:             const builder = createPhpProgramBuilder('Demo\\Plugin\\Rest');
25:             const program = builder.toProgram();
133:            const program = builder.getProgramAst();

packages/cli/src/next/builders/php/domains/__tests__/writer.test.ts
22:                             expect(payload.ast).toEqual(builder.getProgramAst());
41:                     ast: builder.getProgramAst(),
87:     builder.appendProgramStatement(

packages/cli/src/next/builders/php/domains/__tests__/base-controller.test.ts
15:             const program = builder.getProgramAst();
```

I need to modify the tests to use `PhpProgramBuilder` for AST generation, inspecting related methods.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/program/templates.ts
import {
        createClass,
        createClassMethod,
        createDocComment,
        createFullyQualifiedName,
        createIdentifier,
        createName,
        type PhpAttrGroup,
        type PhpAttributes,
        type PhpName,
        type PhpParam,
        type PhpStmt,
        type PhpStmtClass,
        type PhpStmtClassMethod,
        type PhpType,
} from './nodes';
import { createPrintable, type PhpPrintable } from './printables';
import { formatClassModifiers } from './modifiers';

export const PHP_INDENT = '        ';

export type PhpMethodTemplate = string[] & {
        readonly node?: PhpStmtClassMethod;
};

export class PhpMethodBodyBuilder {
        private readonly lines: string[] = [];

        private readonly statements: PhpStmt[] = [];

        public constructor(
                private readonly indentUnit: string,
                private readonly indentLevel: number
        ) {}

        public line(content = ''): void {
                if (content === '') {
                        this.lines.push('');
                        return;
                }

                const indent = this.indentUnit.repeat(this.indentLevel);
                this.lines.push(`${indent}${content}`);
        }

        public raw(content: string): void {
                this.lines.push(content);
        }

        public blank(): void {
                this.lines.push('');
        }

        public statement(
                printable: PhpPrintable<PhpStmt>,
                options: { applyIndent?: boolean } = {}
        ): void {
                const { applyIndent = false } = options;
                const indent = this.indentUnit.repeat(this.indentLevel);

                for (const line of printable.lines) {
                        if (applyIndent) {
                                if (line === '') {
                                        this.lines.push('');
                                } else {
                                        this.lines.push(`${indent}${line}`);
                                }
                        } else {
                                this.lines.push(line);
                        }
                }

                this.statements.push(printable.node);
        }

        public toLines(): string[] {
                return [...this.lines];
        }

        public toStatements(): PhpStmt[] {
                return [...this.statements];
        }
}

export interface PhpMethodTemplateAstOptions {
        readonly name?: string;
        readonly flags?: number;
        readonly byRef?: boolean;
        readonly params?: PhpParam[];
        readonly returnType?: PhpType | null;
        readonly attrGroups?: PhpAttrGroup[];
        readonly attributes?: PhpAttributes;
}

export interface PhpMethodTemplateOptions {
        signature: string;
        indentLevel: number;
        docblock?: string[];
        indentUnit?: string;
        body: (body: PhpMethodBodyBuilder) => void;
        ast?: PhpMethodTemplateAstOptions;
}

export function createMethodTemplate(
        options: PhpMethodTemplateOptions
): PhpMethodTemplate {
        const indentUnit = options.indentUnit ?? PHP_INDENT;
        const indent = indentUnit.repeat(options.indentLevel);
        const lines: string[] = [];

        if (options.docblock?.length) {
                lines.push(`${indent}/**`);
                for (const docLine of options.docblock) {
                        lines.push(`${indent} * ${docLine}`);
                }
                lines.push(`${indent} */`);
        }

        lines.push(`${indent}${options.signature}`);
        lines.push(`${indent}{`);

        const bodyBuilder = new PhpMethodBodyBuilder(
                indentUnit,
                options.indentLevel + 1
        );
        options.body(bodyBuilder);
        const bodyLines = bodyBuilder.toLines();
        if (bodyLines.length > 0) {
                lines.push(...bodyLines);
        }

        lines.push(`${indent}}`);

        const methodNode = createMethodNode(options, bodyBuilder.toStatements());

        const template = Object.assign([...lines], {
                node: methodNode,
        }) as PhpMethodTemplate;

        return template;
}

function createMethodNode(
        options: PhpMethodTemplateOptions,
        bodyStatements: PhpStmt[]
): PhpStmtClassMethod {
        const astOptions = options.ast ?? {};
        const methodName =
                astOptions.name ?? inferMethodName(options.signature) ?? 'method';

        const methodAttributes = mergeAttributes(
                astOptions.attributes,
                options.docblock
        );

        return createClassMethod(
                createIdentifier(methodName),
                {
                        byRef: astOptions.byRef ?? false,
                        flags: astOptions.flags ?? 0,
                        params: astOptions.params ?? [],
                        returnType: astOptions.returnType ?? null,
                        stmts: bodyStatements.length > 0 ? bodyStatements : [],
                        attrGroups: astOptions.attrGroups ?? [],
                },
                methodAttributes
        );
}

function mergeAttributes(
        attributes: PhpAttributes | undefined,
        docblock: readonly string[] | undefined
): PhpAttributes | undefined {
        if (!docblock?.length) {
                return attributes;
        }

        const docComment = createDocComment(docblock);

        if (!attributes) {
                return { comments: [docComment] };
        }

        const existingComments = Array.isArray(
                (attributes as { comments?: unknown }).comments
        )
                ? ([
                                ...((
                                        attributes as {
                                                comments?: unknown;
                                        }
                                ).comments as unknown[]),
                                docComment,
                        ] as unknown[])
                : [docComment];

        return {
                ...attributes,
                comments: existingComments,
        } as PhpAttributes;
```

The method template has an AST node property. I'll check what `appendMethodTemplates` does.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/program/append.ts
import type { PhpStmt } from './nodes';
import type { PhpFileBuilder } from './programBuilder';
import type { PhpPrintable } from './printables';
import type { PhpClassTemplate, PhpMethodTemplate } from './templates';

export function appendMethodTemplates(
        builder: PhpFileBuilder,
        methods: readonly PhpMethodTemplate[]
): void {
        methods.forEach((method, index) => {
                method.forEach((line) => {
                        builder.appendStatement(line);
                });

                if (method.node) {
                        builder.appendProgramStatement(method.node);
                }

                if (index < methods.length - 1) {
                        builder.appendStatement('');
                }
        });
}

export function appendClassTemplate(
        builder: PhpFileBuilder,
        template: PhpClassTemplate
): void {
        appendPrintable(builder, template);
}

export function appendPrintable(
        builder: PhpFileBuilder,
        printable: PhpPrintable<PhpStmt>
): void {
        printable.lines.forEach((line) => {
                builder.appendStatement(line);
        });

        builder.appendProgramStatement(printable.node);
}
```

I'm reconsidering how to handle builders; shifting from strings to AST is likely necessary.
I’ll explore creating a new helper to convert method templates directly into class AST.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "appendClassTemplate" -n packages/cli/src/next/builders/php/domains
packages/cli/src/next/builders/php/domains/base-controller.ts
4:      appendClassTemplate,
51:     appendClassTemplate(builder, classTemplate);
```

I'm wondering if `appendClassTemplate` should be removed. The instructions mention string emitters, so maybe restructuring to use AST creation functions like `createPhpProgramBuilder` would be better. I'll check out `render.ts` and other domain modules to see if there are AST helpers for this.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/domains/render.ts
import type { PhpFileAst } from '@wpkernel/cli/next/builders/php';

export function renderPhpFile(ast: PhpFileAst): string {
        const lines: string[] = ['<?php', 'declare(strict_types=1);', ''];

        if (ast.docblock.length > 0) {
                lines.push(...formatDocblock(ast.docblock), '');
        }

        if (ast.namespace) {
                lines.push(`namespace ${ast.namespace};`, '');
        }

        if (ast.uses.length > 0) {
                for (const use of ast.uses) {
                        lines.push(`use ${use};`);
                }

                lines.push('');
        }

        lines.push('// WPK:BEGIN AUTO');
        lines.push(...ast.statements);
        lines.push('// WPK:END AUTO', '');

        return ensureTrailingNewline(lines.join('\n'));
}

function formatDocblock(lines: readonly string[]): string[] {
        return ['/**', ...lines.map((line) => ` * ${line}`), ' */'];
}

function ensureTrailingNewline(value: string): string {
        return value.endsWith('\n') ? value : `${value}\n`;
}
```

Looks like Phase1 may move away from `renderPhpFile`. I need to check Phase0 expectations.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/domains/context.ts
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { Reporter } from '@wpkernel/core/reporter';
import type { AdapterContext } from '../../../../config/types';
import type { PrinterContext } from './types';

export function ensureAdapterContext(
        context: PrinterContext
): AdapterContext & { ir: PrinterContext['ir'] } {
        if (context.adapterContext) {
                const adapterContext: AdapterContext & {
                        ir: PrinterContext['ir'];
                } = {
                        ...context.adapterContext,
                        config: context.adapterContext.config ?? context.ir.config,
                        reporter: isReporter(context.adapterContext.reporter)
                                ? context.adapterContext.reporter
                                : createNoopReporter(),
                        namespace:
                                context.adapterContext.namespace ??
                                context.ir.meta.sanitizedNamespace,
                        ir: context.adapterContext.ir ?? context.ir,
                };

                context.adapterContext = adapterContext;

                return adapterContext;
        }

        const adapterContext: AdapterContext & {
                ir: PrinterContext['ir'];
        } = {
                config: context.ir.config,
                reporter: createNoopReporter(),
                namespace: context.ir.meta.sanitizedNamespace,
                ir: context.ir,
        };

        context.adapterContext = adapterContext;

        return adapterContext;
}

function isReporter(value: unknown): value is Reporter {
        if (!value || typeof value !== 'object') {
                return false;
        }

        const candidate = value as Record<string, unknown>;
        return (
                typeof candidate.info === 'function' &&
                typeof candidate.warn === 'function' &&
                typeof candidate.error === 'function' &&
                typeof candidate.debug === 'function' &&
                typeof candidate.child === 'function'
        );
}
```

It seems Phase1 suggests removing `PrinterContext` in favor of `PhpDomainContext`. I'll examine domain modules and begin updating them accordingly.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/domains/wp-post/context.ts
import type { PrinterContext } from '../types';
import type { IRResource } from '../../../../../ir';
import {
        type PhpFileBuilder,
        createErrorCodeFactory,
        isNonEmptyString,
        toPascalCase,
} from '@wpkernel/cli/next/builders/php';
import { resolveIdentityConfig } from '../identity';
import {
        type IdentityConfig,
        type WpPostMetaDescriptor,
        type WpPostRouteDefinition,
        type WpPostStorage,
        type WpPostTaxonomyDescriptor,
} from './types';
import { collectCanonicalBasePaths } from './routes';

export interface WpPostContext {
        builder: PhpFileBuilder;
        context: PrinterContext;
        resource: IRResource;
        storage: WpPostStorage;
        pascalName: string;
        identity: IdentityConfig;
        metaEntries: Array<[string, WpPostMetaDescriptor]>;
        taxonomyEntries: Array<[string, WpPostTaxonomyDescriptor]>;
        supports: Set<string>;
        statuses: string[];
        defaultStatus: string;
        canonicalBasePaths: Set<string>;
        errorCode: (suffix: string) => string;
        titleCaseName: () => string;
}

export interface CreateWpPostContextOptions {
        builder: PhpFileBuilder;
        context: PrinterContext;
        resource: IRResource;
        routes: WpPostRouteDefinition[];
}

export function createWpPostContext(
        options: CreateWpPostContextOptions
): WpPostContext {
        const storage = options.resource.storage as WpPostStorage;
        const pascalName = toPascalCase(options.resource.name);
        const identity = resolveIdentityConfig(options.resource);

        const metaEntries = Object.entries(storage.meta ?? {}) as Array<
                [string, WpPostMetaDescriptor]
        >;
        const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
                [string, WpPostTaxonomyDescriptor]
        >;
        const supports = new Set<string>(
                Array.isArray(storage.supports) ? storage.supports : []
        );
        const statuses = Array.isArray(storage.statuses)
                ? storage.statuses.filter(isNonEmptyString)
                : [];
        const defaultStatus = statuses[0] ?? 'publish';
        const canonicalBasePaths = collectCanonicalBasePaths(
                options.routes,
                identity.param
        );

        options.builder.addUse('WP_Error');
        options.builder.addUse('WP_Post');
        options.builder.addUse('WP_Query');
        options.builder.addUse('WP_REST_Request');

        const errorCode = createErrorCodeFactory(options.resource.name);

        const titleCaseName = (): string => pascalName;

        return {
                builder: options.builder,
                context: options.context,
                resource: options.resource,
                storage,
                pascalName,
                identity,
                metaEntries,
                taxonomyEntries,
                supports,
                statuses,
                defaultStatus,
                canonicalBasePaths,
                errorCode,
                titleCaseName,
        };
}
```

Phase1 requires converting domain modules to ASTs while still using the builder. I’ll create helpers for minimal changes and follow instructions to replace certain methods.
I’ll create a new helper to convert method templates directly to AST nodes, using existing functions.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "PhpClassTemplate" packages/cli/src/next/builders/php/program -n
packages/cli/src/next/builders/php/program/templates.ts
212:export interface PhpClassTemplateOptions {
223:export type PhpClassTemplate = PhpPrintable<PhpStmtClass>;
226:    options: PhpClassTemplateOptions
227:): PhpClassTemplate {
290:    value: PhpClassTemplateOptions['extends']

packages/cli/src/next/builders/php/program/append.ts
4:import type { PhpClassTemplate, PhpMethodTemplate } from './templates';
27:     template: PhpClassTemplate

root@9d20af90c396:/workspace/wp-kernel# sed -n '212,320p' packages/cli/src/next/builders/php/program/templates.ts
export interface PhpClassTemplateOptions {
        readonly name: string;
        readonly flags?: number;
        readonly docblock?: readonly string[];
        readonly extends?: PhpName | string | readonly string[] | null;
        readonly implements?: ReadonlyArray<PhpName | string | readonly string[]>;
        readonly methods?: readonly PhpMethodTemplate[];
        readonly attrGroups?: readonly PhpAttrGroup[];
        readonly attributes?: PhpAttributes;
}

export type PhpClassTemplate = PhpPrintable<PhpStmtClass>;

export function createClassTemplate(
        options: PhpClassTemplateOptions
): PhpClassTemplate {
        const docblock = options.docblock ?? [];
        const methods = options.methods ?? [];

        const classAttributes = mergeAttributes(options.attributes, docblock);

        const extendsName = normaliseName(options.extends);
        const implementsNames = (options.implements ?? [])
                .map(normaliseName)
                .filter((name): name is PhpName => Boolean(name));

        const classNode = createClass(
                createIdentifier(options.name),
                {
                        flags: options.flags ?? 0,
                        extends: extendsName,
                        implements: implementsNames,
                        stmts: methods
                                .map((method) => method.node)
                                .filter((node): node is PhpStmtClassMethod => Boolean(node)),
                        attrGroups: options.attrGroups ? [...options.attrGroups] : [],
                },
                classAttributes
        );

        const lines: string[] = [];

        if (docblock.length > 0) {
                lines.push('/**');
                for (const line of docblock) {
                        lines.push(` * ${line}`);
                }
                lines.push(' */');
        }

        const modifiers = formatClassModifiers(options.flags ?? 0);
        const signature = [
                ...modifiers,
                'class',
                options.name,
                formatExtendsClause(extendsName),
                formatImplementsClause(implementsNames),
        ]
                .filter((part) => part.length > 0)
                .join(' ');

        lines.push(signature);
        lines.push('{');

        methods.forEach((method, index) => {
                method.forEach((line) => lines.push(line));

                if (index < methods.length - 1) {
                        lines.push('');
                }
        });

        lines.push('}');

        return createPrintable(classNode, lines);
}

function normaliseName(
        value: PhpClassTemplateOptions['extends']
): PhpName | null {
        if (!value) {
                return null;
        }

        if (typeof value === 'object' && 'nodeType' in value) {
                return value as PhpName;
        }

        const parts = Array.isArray(value)
                ? value
                : String(value).split('\\').filter(Boolean);

        if (parts.length === 0) {
                return null;
        }

        if (typeof value === 'string' && value.startsWith('\\')) {
                return createFullyQualifiedName([...parts]);
        }

        return createName([...parts]);
}

function formatExtendsClause(name: PhpName | null): string {
        if (!name) {
                return '';
        }

        return `extends ${formatName(name)}`;
```

I’m thinking of using `createPhpProgramBuilder` to build the program without relying on strings.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,160p' packages/cli/src/next/builders/php/program/index.ts
export * from './append';
export * from './constants';
export * from './docblocks';
export * from './modifiers';
export * from './nodes';
export * from './printables';
export * from './programBuilder';
export * from './templates';
export * from './types';
export * from './utils';
export * from './valueRenderers';
```

I'm updating domain modules to use `PhpDomainContext` instead of `PrinterContext` for AST building.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "appendStatement" packages/cli/src/next/builders/php/program/programBuilder.ts -n
203:    public appendStatement(node: PhpStmt): void {
318:    public appendStatement(statement: string): void {
323:            this.program.appendStatement(statement);
```

I'll take a look at the method around line 203.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '180,240p' packages/cli/src/next/builders/php/program/programBuilder.ts
                this.docblockLines.push(line);
        }

        public getDocblock(): readonly string[] {
                return [...this.docblockLines];
        }

        public addUse(
                statement: string,
                options: { alias?: string | null; kind?: UseKind } = {}
        ): void {
                const parsed = normaliseUse(statement, options);
                if (!parsed) {
                        return;
                }

                this.uses.set(parsed.key, parsed);
        }

        public getUses(): readonly string[] {
                return this.getSortedUses().map(createUseString);
        }

        public appendStatement(node: PhpStmt): void {
                this.statements.push(node);
        }

        public getStatements(): readonly PhpStmt[] {
                return [...this.statements];
        }

        public toProgram(): PhpProgram {
                const program: PhpStmt[] = [];

                const strictTypes = createDeclare([
                        createDeclareItem('strict_types', createScalarInt(1)),
                ]);
                program.push(strictTypes);

                const namespaceAttributes = this.docblockLines.length
                        ? { comments: [createDocComment(this.docblockLines)] }
                        : undefined;

                const namespaceName = this.namespaceParts.length
                        ? createNamespaceName(this.namespaceParts)
                        : null;

                const namespaceStatements: PhpStmt[] = [];

                for (const useEntry of this.getSortedUses()) {
                        const nameNode = useEntry.fullyQualified
                                ? createFullyQualifiedName([...useEntry.parts])
                                : createName([...useEntry.parts]);
                        const useNode = createUse(useEntry.type, [
                                createUseUse(
                                        nameNode,
                                        useEntry.alias ? createIdentifier(useEntry.alias) : null
                                ),
                        ]);
                        namespaceStatements.push(useNode);
                }
```

I'll ensure docblocks and uses are added while using AST nodes. Functions will work with classes and methods, leveraging templates and avoiding string lines.
I'll modify `builder.appendStatement` for class extensions and ensure docblocks are handled correctly.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "appendGeneratedFileDocblock" -n packages/cli/src/next/builders/php/program
packages/cli/src/next/builders/php/program/docblocks.ts
5:export function appendGeneratedFileDocblock(

root@9d20af90c396:/workspace/wp-kernel# sed -n '1,120p' packages/cli/src/next/builders/php/program/docblocks.ts
import { DEFAULT_DOC_HEADER } from './constants';
import { createDocComment, type PhpDocComment } from './nodes';
import type { PhpFileBuilder } from './programBuilder';

export function appendGeneratedFileDocblock(
        builder: PhpFileBuilder,
        extraLines: Iterable<string>
): void {
        for (const line of DEFAULT_DOC_HEADER) {
                builder.appendDocblock(line);
        }

        for (const line of extraLines) {
                builder.appendDocblock(line);
        }
}

export function createGeneratedFileDocComment(
        extraLines: Iterable<string>
): PhpDocComment {
        const lines = [...DEFAULT_DOC_HEADER, ...extraLines];
        return createDocComment(lines);
}
```

I’m considering creating a doc comment function for `PhpProgramBuilder` and using `DEFAULT_DOC_HEADER`. Since the builder can call `appendDocblock`, I might just append lines directly. I also need to inspect `routes.ts` and related modules, like controllers and helpers.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,200p' packages/cli/src/next/builders/php/domains/routes.ts
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRResource, IRRoute } from '../../../../ir';
import type { PrinterContext } from './types';
import {
        type PhpFileBuilder,
        createMethodTemplate,
        PHP_INDENT,
        escapeSingleQuotes,
        toPascalCase,
} from '@wpkernel/cli/next/builders/php';
import { createWpPostHandlers } from './wp-post';
import { createWpTaxonomyHandlers } from './wp-taxonomy';
import { createWpOptionHandlers } from './wp-option';
import { createTransientHandlers } from './transient';

export function createRouteHandlers(options: {
        builder: PhpFileBuilder;
        context: PrinterContext;
        resource: IRResource;
        routes: IRRoute[];
}): string[][] {
        const routeDefinitions = options.routes.map((route) => ({
                route,
                methodName: createRouteMethodName(route, options.context),
        }));
        let methods: string[][];

        switch (options.resource.storage?.mode) {
                case 'wp-post':
                        methods = createWpPostHandlers({
                                builder: options.builder,
                                context: options.context,
                                resource: options.resource,
                                routes: routeDefinitions,
                        });
                        break;
                case 'wp-taxonomy':
                        methods = createWpTaxonomyHandlers({
                                builder: options.builder,
                                context: options.context,
                                resource: options.resource,
                                routes: routeDefinitions,
                        });
                        break;
                case 'wp-option':
                        methods = createWpOptionHandlers({
                                builder: options.builder,
                                context: options.context,
                                resource: options.resource,
                                routes: routeDefinitions,
                        });
                        break;
                case 'transient':
                        methods = createTransientHandlers({
                                builder: options.builder,
                                context: options.context,
                                resource: options.resource,
                                routes: routeDefinitions,
                        });
                        break;
                default:
                        methods = createRouteStubs(options);
                        break;
        }

        return applyPolicyGuards({
                methods,
                routeDefinitions,
        });
}

export function createRouteMethodName(
        route: IRRoute,
        context: PrinterContext
): string {
        const method = route.method.toLowerCase();
        const segments = deriveRouteSegments(route.path, context);
        const suffix = segments.map(toPascalCase).join('') || 'Route';
        return `${method}${suffix}`;
}

export function warnOnMissingPolicies(options: {
        reporter: Reporter;
        resource: IRResource;
        routes: IRRoute[];
}): void {
        const { reporter, resource, routes } = options;

        for (const route of routes) {
                const missingPolicy = isWriteRoute(route.method) && !route.policy;
                if (!missingPolicy) {
                        continue;
                }

                reporter.warn('Write route missing policy.', {
                        resource: resource.name,
                        method: route.method,
                        path: route.path,
                });
        }
}

function createRouteStubs(options: {
        builder: PhpFileBuilder;
        context: PrinterContext;
        resource: IRResource;
        routes: IRRoute[];
}): string[][] {
        const { builder, resource, routes } = options;

        builder.addUse('WP_Error');
        builder.addUse('WP_REST_Request');

        return routes.map((route) =>
                createMethodTemplate({
                        signature: `public function ${createRouteMethodName(
                                route,
                                options.context
                        )}( WP_REST_Request $request )`,
                        indentLevel: 1,
                        indentUnit: PHP_INDENT,
                        docblock: [`Handle [${route.method}] ${route.path}.`],
                        body: (body) => {
                                if (routeUsesIdentity(route, resource.identity)) {
                                        const param = resource.identity?.param ?? 'id';
                                        body.line(`$${param} = $request->get_param( '${param}' );`);
                                        body.blank();
                                }

                                body.line(
                                        `// TODO: Implement handler for [${route.method}] ${route.path}.`
                                );
                                body.line("return new WP_Error( 501, 'Not Implemented' );");
                        },
                })
        );
}

function applyPolicyGuards(options: {
        methods: string[][];
        routeDefinitions: Array<{ route: IRRoute }>;
}): string[][] {
        const guarded: string[][] = [];
        const routeCount = options.routeDefinitions.length;

        for (let index = 0; index < options.methods.length; index += 1) {
                const methodLines = options.methods[index]!;
                if (index < routeCount) {
                        const route = options.routeDefinitions[index]!.route;
                        guarded.push(injectPolicyGuard(methodLines, route));
                } else {
                        guarded.push(methodLines);
                }
        }

        return guarded;
}

function injectPolicyGuard(methodLines: string[], route: IRRoute): string[] {
        if (!route.policy) {
                return methodLines;
        }

        const openIndex = methodLines.findIndex((line) => line.trim() === '{');
        if (openIndex === -1) {
                return methodLines;
        }

        const guardLines = [
                `${PHP_INDENT.repeat(2)}$permission = Policy::enforce( '${escapeSingleQuotes(route.policy)}', $request );`,
                `${PHP_INDENT.repeat(2)}if ( is_wp_error( $permission ) ) {`,
                `${PHP_INDENT.repeat(3)}return $permission;`,
                `${PHP_INDENT.repeat(2)}}`,
                '',
        ];

        const next = [...methodLines];
        next.splice(openIndex + 1, 0, ...guardLines);
        return next;
}

function deriveRouteSegments(
        routePath: string,
        context: PrinterContext
): string[] {
        const trimmed = routePath.replace(/^\/+/, '');
        if (!trimmed) {
                return [];
        }

        const segments = trimmed
                .split('/')
                .filter(Boolean)
                .map((segment) => segment.replace(/^:/, ''));

        const namespaceVariants = new Set<string>(
                [
                        context.ir.meta.namespace,
                        context.ir.meta.namespace.replace(/\\/g, '/'),
                        context.ir.meta.sanitizedNamespace,
```

I need to replace `PrinterContext` dependencies with `PhpDomainContext` across domain modules. I'll check how `routes.ts` uses `context.ir` and all other `PrinterContext` references for adjustments.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "context\." packages/cli/src/next/builders/php/domains -g"*.ts"
packages/cli/src/next/builders/php/domains/writer.ts
17:     if (context.phpAdapter?.customise) {
18:             context.phpAdapter.customise(builder, adapterContext);
22:     const driver = context.phpDriver;
41:     await context.ensureDirectory(targetDirectory);
42:     await context.writeFile(filePath, code);
43:     await context.writeFile(astOutputPath, serialiseAst(ast));

packages/cli/src/next/builders/php/domains/base-controller.ts
25:             `Source: ${context.ir.meta.origin} → resources (namespace: ${context.ir.meta.sanitizedNamespace})`,
39:                                     createPhpReturn(context.ir.meta.sanitizedNamespace, 2)

packages/cli/src/next/builders/php/domains/context.ts
9:      if (context.adapterContext) {
13:                     ...context.adapterContext,
14:                     config: context.adapterContext.config ?? context.ir.config,
15:                     reporter: isReporter(context.adapterContext.reporter)
16:                             ? context.adapterContext.reporter
19:                             context.adapterContext.namespace ??
20:                             context.ir.meta.sanitizedNamespace,
21:                     ir: context.adapterContext.ir ?? context.ir,
24:             context.adapterContext = adapterContext;
32:             config: context.ir.config,
34:             namespace: context.ir.meta.sanitizedNamespace,
35:             ir: context.ir,
38:     context.adapterContext = adapterContext;

packages/cli/src/next/builders/php/domains/resource-controller.ts
34:             `Source: ${context.ir.meta.origin} → resources.${resource.name}`,
45:     const schema = context.ir.schemas.find(

packages/cli/src/next/builders/php/domains/policy-helper.ts
21:     const source = context.ir.policyMap.sourcePath ?? '[fallback]';
24:             `Source: ${context.ir.meta.origin} → policy-map (${source})`,
39:             sanitizeJson(context.ir.policyMap.fallback)
82:     for (const definition of context.ir.policyMap.definitions) {

packages/cli/src/next/builders/php/domains/transient.ts
55:             options.context.ir.meta.sanitizedNamespace ??
56:             options.context.ir.meta.namespace ??
124:                    body.line(`$key = $this->get${context.pascalName}TransientKey();`);
147:                    body.line(`$key = $this->get${context.pascalName}TransientKey();`);
151:                            `$expiration = $this->normalise${context.pascalName}Expiration( $request->get_param( 'expiration
' ) );`
181:                            `return new WP_Error( '${context.errorCode('unsupported_operation')}', '${escapeSingleQuotes(`Op
eration not supported for ${context.titleCaseName()} transient.`)}', array( 'status' => 501 ) );`
192:                    signature: `private function get${context.pascalName}TransientKey(): string`,
197:                                    `return '${escapeSingleQuotes(context.transientKey)}';`
205:                    signature: `private function normalise${context.pascalName}Expiration( $value ): int`,

packages/cli/src/next/builders/php/domains/persistence-registry.ts
22:             `Source: ${context.ir.meta.origin} → resources (storage + identity metadata)`,
52:     for (const resource of context.ir.resources) {

packages/cli/src/next/builders/php/domains/index-file.ts
40:     lines.push(` * Source: ${options.context.ir.meta.origin} → php/index`);

packages/cli/src/next/builders/php/domains/printer.ts
13:     const phpRoot = path.resolve(context.outputDir, 'php');
14:     await context.ensureDirectory(phpRoot);
16:     const namespaceRoot = context.ir.php.namespace;
36:     for (const resource of context.ir.resources) {
89:     const formattedIndex = await context.formatPhp(indexPath, indexContents);
90:     await context.ensureDirectory(path.dirname(indexPath));
91:     await context.writeFile(indexPath, formattedIndex);

packages/cli/src/next/builders/php/domains/test-utils/wp-post.ts
59:                     const sanitizedNamespace = context.ir.meta.sanitizedNamespace;

packages/cli/src/next/builders/php/domains/wp-option.ts
121:                            `$option_name = $this->get${context.pascalName}OptionName();`
146:                            `$option_name = $this->get${context.pascalName}OptionName();`
151:                            `$autoload = $this->normalise${context.pascalName}Autoload( $request->get_param( 'autoload' ) );
`
187:                            `return new WP_Error( '${context.errorCode('unsupported_operation')}', '${escapeSingleQuotes(`Op
eration not supported for ${context.titleCaseName()} option.`)}', array( 'status' => 501 ) );`
198:                    signature: `private function get${context.pascalName}OptionName(): string`,
203:                                    `return '${escapeSingleQuotes(context.optionName)}';`
211:                    signature: `private function normalise${context.pascalName}Autoload( $value ): ?string`,

packages/cli/src/next/builders/php/domains/wp-post/delete.ts
29:     const identityVar = `$${context.identity.param}`;
31:             `${identityVar} = $request->get_param( '${context.identity.param}' );`
36:             `$post = $this->resolve${context.pascalName}Post( ${identityVar} );`
40:             `        return new WP_Error( '${context.errorCode('not_found')}', '${context.titleCaseName()} not found.', arra
y( 'status' => 404 ) );`
45:             `$previous = $this->prepare${context.pascalName}Response( $post, $request );`
50:             `        return new WP_Error( '${context.errorCode('delete_failed')}', 'Unable to delete ${context.titleCaseName
()}.', array( 'status' => 500 ) );`

packages/cli/src/next/builders/php/domains/wp-post/supports.ts
22:     if (context.supports.has('title')) {
29:     if (context.supports.has('editor')) {
36:     if (context.supports.has('excerpt')) {

packages/cli/src/next/builders/php/domains/wp-post/list.ts
30:     body.line(`$post_type = $this->get${context.pascalName}PostType();`);
40:     if (context.statuses.length > 0) {
41:             body.line(`$statuses = $this->get${context.pascalName}Statuses();`);
46:     if (context.statuses.length > 0) {
59:     if (context.metaEntries.length > 0) {
63:     if (context.taxonomyEntries.length > 0) {
77:             `        $items[] = $this->prepare${context.pascalName}Response( $post, $request );`

packages/cli/src/next/builders/php/domains/wp-post/meta.ts
12:     for (const [key, descriptor] of context.metaEntries) {

packages/cli/src/next/builders/php/domains/wp-post/create.ts
30:     body.line(`$post_type = $this->get${context.pascalName}PostType();`);
34:             `$post_status = $this->normalise${context.pascalName}Status( $status );`
50:     body.line(`$this->sync${context.pascalName}Meta( $post_id, $request );`);
52:             `$taxonomy_result = $this->sync${context.pascalName}Taxonomies( $post_id, $request );`
61:             `        return new WP_Error( '${context.errorCode('load_failed')}', 'Unable to load created ${context.titleCase
Name()}.', array( 'status' => 500 ) );`
66:             `return $this->prepare${context.pascalName}Response( $post, $request );`

packages/cli/src/next/builders/php/domains/wp-taxonomy/helpers.ts
13:                     signature: `private function get${context.pascalName}Taxonomy(): string`,
17:                             body.line(`return '${escapeSingleQuotes(context.taxonomy)}';`);
24:                     signature: `private function prepare${context.pascalName}TermResponse( WP_Term $term ): array`,
34:                                     `        'hierarchical' => ${context.hierarchical ? 'true' : 'false'},`
48:                     signature: `private function resolve${context.pascalName}Term( $identity ): ?WP_Term`,
53:                                     `$taxonomy = $this->get${context.pascalName}Taxonomy();`
...
201:                            if (context.identity.param === 'slug') {
207:                            if (context.supports.has('title')) {
211:                            if (context.supports.has('editor')) {
217:                            if (context.supports.has('excerpt')) {
223:                            for (const [key, descriptor] of context.metaEntries) {
234:                            for (const [key, descriptor] of context.taxonomyEntries) {
255:                    signature: `private function sync${context.pascalName}Meta( int $post_id, WP_REST_Request $request ): vo
id`,
259:                            if (context.metaEntries.length === 0) {
265:                            for (const [key, descriptor] of context.metaEntries) {
294:                    signature: `private function sync${context.pascalName}Taxonomies( int $post_id, WP_REST_Request $request
 )`,
298:                            if (context.taxonomyEntries.length === 0) {
305:                            for (const [key, descriptor] of context.taxonomyEntries) {

packages/cli/src/next/builders/php/domains/wp-taxonomy/methods/list.ts
19:                     body.line(`$taxonomy = $this->get${context.pascalName}Taxonomy();`);
61:                             `                $items[] = $this->prepare${context.pascalName}TermResponse( $term );`

packages/cli/src/next/builders/php/domains/wp-post/update.ts
30:     const identityVar = `$${context.identity.param}`;
32:             `${identityVar} = $request->get_param( '${context.identity.param}' );`
37:             `$post = $this->resolve${context.pascalName}Post( ${identityVar} );`
41:             `        return new WP_Error( '${context.errorCode('not_found')}', '${context.titleCaseName()} not found.', arra
y( 'status' => 404 ) );`
48:             `        'post_type' => $this->get${context.pascalName}PostType(),`
55:             `        $post_data['post_status'] = $this->normalise${context.pascalName}Status( $status );`
67:     body.line(`$this->sync${context.pascalName}Meta( $post->ID, $request );`);
69:             `$taxonomy_result = $this->sync${context.pascalName}Taxonomies( $post->ID, $request );`
78:             `        return new WP_Error( '${context.errorCode('load_failed')}', 'Unable to load updated ${context.titleCase
Name()}.', array( 'status' => 500 ) );`
83:             `return $this->prepare${context.pascalName}Response( $updated, $request );`

packages/cli/src/next/builders/php/domains/wp-post/stub.ts
20:                     if (definition.route.path.includes(`:${context.identity.param}`)) {
22:                                     `$${context.identity.param} = $request->get_param( '${context.identity.param}' );`

packages/cli/src/next/builders/php/domains/wp-post/taxonomies.ts
11:     for (const [key, descriptor] of context.taxonomyEntries) {

packages/cli/src/next/builders/php/domains/wp-post/identity.ts
9:      if (context.identity.type === 'number') {
12:                     `        return new WP_Error( '${context.errorCode('missing_identifier')}', 'Missing identifier for ${co
ntext.titleCaseName()}.', array( 'status' => 400 ) );`
18:                     `        return new WP_Error( '${context.errorCode('invalid_identifier')}', 'Invalid identifier for ${co
ntext.titleCaseName()}.', array( 'status' => 400 ) );`
28:             `        return new WP_Error( '${context.errorCode('missing_identifier')}', 'Missing identifier for ${context.ti
tleCaseName()}.', array( 'status' => 400 ) );`
38:     if (context.identity.param !== 'slug') {
52:     if (context.identity.param !== 'slug') {

packages/cli/src/next/builders/php/domains/wp-post/get.ts
29:     const identityVar = `$${context.identity.param}`;
31:             `${identityVar} = $request->get_param( '${context.identity.param}' );`
36:             `$post = $this->resolve${context.pascalName}Post( ${identityVar} );`
40:             `        return new WP_Error( '${context.errorCode('not_found')}', '${context.titleCaseName()} not found.', arra
y( 'status' => 404 ) );`
45:             `return $this->prepare${context.pascalName}Response( $post, $request );`

packages/cli/src/next/builders/php/domains/wp-post/handlers.ts
21:                     context.identity.param,
22:                     context.canonicalBasePaths

packages/cli/src/next/builders/php/domains/types.ts
51:             ir: context.ir,
52:             namespaceRoot: context.ir.php.namespace,

packages/cli/src/next/builders/php/domains/routes.ts
198:                    context.ir.meta.namespace,
199:                    context.ir.meta.namespace.replace(/\\/g, '/'),
200:                    context.ir.meta.sanitizedNamespace,
201:                    context.ir.meta.sanitizedNamespace.replace(/\\/g, '/'),

packages/cli/src/next/builders/php/domains/wp-taxonomy/methods/get.ts
11:     const identityParam = context.identity.param;
21:                             `$identity = $this->validate${context.pascalName}Identity( $request->get_param( '${identityParam
}' ) );`
28:                             `$term = $this->resolve${context.pascalName}Term( $identity );`
32:                             `        return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${context.t
itleCaseName()} term.', array( 'status' => 404 ) );`
37:                             `return $this->prepare${context.pascalName}TermResponse( $term );`

packages/cli/src/next/builders/php/domains/wp-taxonomy/handlers.ts
20:                     context.identity.param

packages/cli/src/next/builders/php/domains/wp-taxonomy/methods/update.ts
12:     const identityParam = context.identity.param;
21:                     body.line(`$taxonomy = $this->get${context.pascalName}Taxonomy();`);
23:                             `$identity = $this->validate${context.pascalName}Identity( $request->get_param( '${identityParam
}' ) );`
30:                             `$term = $this->resolve${context.pascalName}Term( $identity );`
34:                             `        return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${escapeSin
gleQuotes(context.titleCaseName())} term.', array( 'status' => 404 ) );`
39:                             `$args = $this->extract${context.pascalName}TermArgs( $request );`
47:                             `        return $this->prepare${context.pascalName}TermResponse( $term );`
64:                             `        return $this->prepare${context.pascalName}TermResponse( $updated );`
69:                             `return $this->prepare${context.pascalName}TermResponse( $term );`

packages/cli/src/next/builders/php/domains/wp-taxonomy/methods/unsupported.ts
21:                             `return new WP_Error( '${context.errorCode('unsupported_operation')}', '${escapeSingleQuotes(`Op
eration not supported for ${context.titleCaseName()} taxonomy.`)}', array( 'status' => 501 ) );`

packages/cli/src/next/builders/php/domains/wp-taxonomy/methods/remove.ts
12:     const identityParam = context.identity.param;
21:                     body.line(`$taxonomy = $this->get${context.pascalName}Taxonomy();`);
23:                             `$identity = $this->validate${context.pascalName}Identity( $request->get_param( '${identityParam
}' ) );`
30:                             `$term = $this->resolve${context.pascalName}Term( $identity );`
34:                             `        return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${escapeSin
gleQuotes(context.titleCaseName())} term.', array( 'status' => 404 ) );`
46:                             `        return new WP_Error( '${context.errorCode('delete_failed')}', 'Failed to delete ${escap
eSingleQuotes(context.titleCaseName())} term.', array( 'status' => 500 ) );`
53:                             `        'previous' => $this->prepare${context.pascalName}TermResponse( $term ),`

packages/cli/src/next/builders/php/domains/wp-taxonomy/methods/create.ts
20:                     body.line(`$taxonomy = $this->get${context.pascalName}Taxonomy();`);
24:                             `        return new WP_Error( '${context.errorCode('missing_name')}', 'Missing name for ${escape
SingleQuotes(context.titleCaseName())} term.', array( 'status' => 400 ) );`
30:                             `$args = $this->extract${context.pascalName}TermArgs( $request );`
42:                             `        return new WP_Error( '${context.errorCode('create_failed')}', 'Failed to create ${escap
eSingleQuotes(context.titleCaseName())} term.', array( 'status' => 500 ) );`
49:                             `        return $this->prepare${context.pascalName}TermResponse( $term );`
54:                             `return new WP_Error( '${context.errorCode('not_found')}', 'Unable to locate ${escapeSingleQuote
s(context.titleCaseName())} term after creation.', array( 'status' => 500 ) );`
```

This change is large and complex. Focus may need to prioritize top-level domain modules.
Main modules should produce `PhpProgram`, submodules likely return method templates. I'll inspect further.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,160p' packages/cli/src/next/builders/php/domains/wp-option.ts
import type { IRResource, IRRoute } from '../../../../ir';
import type { PrinterContext } from './types';
import {
        type PhpFileBuilder,
        createMethodTemplate,
        PHP_INDENT,
        createErrorCodeFactory,
        escapeSingleQuotes,
        toPascalCase,
} from '@wpkernel/cli/next/builders/php';

type WpOptionStorage = Extract<
        NonNullable<IRResource['storage']>,
        { mode: 'wp-option' }
>;

interface RouteDefinition {
        route: IRRoute;
        methodName: string;
}

interface WpOptionContext {
        builder: PhpFileBuilder;
        resource: IRResource;
        storage: WpOptionStorage;
        pascalName: string;
        optionName: string;
        errorCode: (suffix: string) => string;
        titleCaseName: () => string;
}

export function createWpOptionHandlers(options: {
        builder: PhpFileBuilder;
        context: PrinterContext;
        resource: IRResource;
        routes: RouteDefinition[];
}): string[][] {
        if (options.resource.storage?.mode !== 'wp-option') {
                return [];
        }

        const context = createContext(options);
        return buildMethods(context, options.routes);
}

function createContext(options: {
        builder: PhpFileBuilder;
        resource: IRResource;
}): WpOptionContext {
        const storage = options.resource.storage as WpOptionStorage;
        const pascalName = toPascalCase(options.resource.name);
        const errorCode = createErrorCodeFactory(options.resource.name);

        options.builder.addUse('WP_Error');
        options.builder.addUse('WP_REST_Request');

        return {
                builder: options.builder,
                resource: options.resource,
                storage,
                pascalName,
                optionName: storage.option,
                errorCode,
                titleCaseName: () => pascalName,
        };
}

type OptionRouteKind = 'get' | 'update' | 'unsupported';

function buildMethods(
        context: WpOptionContext,
        routes: RouteDefinition[]
): string[][] {
        const methods: string[][] = [];

        for (const definition of routes) {
                const kind = determineRouteKind(definition.route);
                switch (kind) {
                        case 'get':
                                methods.push(createGetMethod(context, definition));
                                break;
                        case 'update':
                                methods.push(createUpdateMethod(context, definition));
                                break;
                        default:
                                methods.push(createUnsupportedMethod(context, definition));
                                break;
                }
        }

        methods.push(...createHelperMethods(context));
        return methods;
}

function determineRouteKind(route: IRRoute): OptionRouteKind {
        switch (route.method) {
                case 'GET':
                        return 'get';
                case 'POST':
                case 'PUT':
                case 'PATCH':
                        return 'update';
                default:
                        return 'unsupported';
        }
}

function createGetMethod(
        context: WpOptionContext,
        definition: RouteDefinition
): string[] {
        return createMethodTemplate({
                signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
                indentLevel: 1,
                indentUnit: PHP_INDENT,
                docblock: [
                        `Handle [${definition.route.method}] ${definition.route.path}.`,
                ],
                body: (body) => {
                        body.line(
                                `$option_name = $this->get${context.pascalName}OptionName();`
                        );
                        body.line('$value = get_option( $option_name );');
                        body.blank();
                        body.line('return array(');
                        body.line("        'option' => $option_name,");
                        body.line("        'value' => $value,");
                        body.line(');');
                },
        });
}

function createUpdateMethod(
        context: WpOptionContext,
        definition: RouteDefinition
): string[] {
        return createMethodTemplate({
                signature: `public function ${definition.methodName}( WP_REST_Request $request )`,
                indentLevel: 1,
                indentUnit: PHP_INDENT,
                docblock: [
                        `Handle [${definition.route.method}] ${definition.route.path}.`,
                ],
                body: (body) => {
                        body.line(
                                `$option_name = $this->get${context.pascalName}OptionName();`
                        );
                        body.line('$previous = get_option( $option_name );');
                        body.line("$value = $request->get_param( 'value' );");
                        body.line(
                                `$autoload = $this->normalise${context.pascalName}Autoload( $request->get_param( 'autoload' ) );
`
                        );
                        body.blank();
                        body.line('if ( null !== $autoload ) {');
                        body.line(
                                '$updated = update_option( $option_name, $value, $autoload );'
                        );
                        body.line('} else {');
                        body.line('$updated = update_option( $option_name, $value );');
                        body.line('}');
```

The spec wants methods to output `PhpProgram` ASTs. I'll focus on converting to `PhpMethodTemplate`.
I'll introduce `PhpDomainContext`, but may keep `PrinterContext` for non-domain modules.

```shell
root@9d20af90c396:/workspace/wp-kernel# rg "PrinterContext" -g"*.ts" packages/cli/src/next/builders -n
packages/cli/src/next/builders/php/domains/writer.ts
6:import type { PrinterContext } from './types';
13:     context: PrinterContext

packages/cli/src/next/builders/php/domains/types.ts
17:export interface PrinterContext {
49:export function toPhpDomainContext(context: PrinterContext): PhpDomainContext {

packages/cli/src/next/builders/php/domains/context.ts
4:import type { PrinterContext } from './types';
7:      context: PrinterContext
8:): AdapterContext & { ir: PrinterContext['ir'] } {
11:                     ir: PrinterContext['ir'];
30:             ir: PrinterContext['ir'];

packages/cli/src/next/builders/php/domains/policy-helper.ts
1:import type { PrinterContext } from './types';
15:     context: PrinterContext
80:function buildPolicyMap(context: PrinterContext): Record<string, unknown> {

packages/cli/src/next/builders/php/domains/persistence-registry.ts
11:import type { PrinterContext } from './types';
15:     context: PrinterContext
48:     context: PrinterContext

packages/cli/src/next/builders/php/domains/routes.ts
3:import type { PrinterContext } from './types';
18:     context: PrinterContext;
74:     context: PrinterContext
105:    context: PrinterContext;
184:    context: PrinterContext

packages/cli/src/next/builders/php/domains/base-controller.ts
14:import type { PrinterContext } from './types';
18:     context: PrinterContext

packages/cli/src/next/builders/php/domains/test-utils/wp-post.ts
1:import type { PrinterContext } from '../types';
15:export function createPrinterContext(): PrinterContext {
34:     } as unknown as PrinterContext;
39:     context: PrinterContext
50:function inferMethodName(route: IRRoute, context: PrinterContext): string {

packages/cli/src/next/builders/php/domains/__tests__/index-file.test.ts
2:import type { PrinterContext } from '../../types';
46:                     context: createPrinterContext(),
67:function createPrinterContext(): PrinterContext {
91:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/resource-controller.test.ts
2:import type { PrinterContext } from '../../types';
9:              const context = createPrinterContext();
36:function createPrinterContext(): PrinterContext {
69:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/wp-option-controller.test.ts
4:import type { PrinterContext } from '../../types';
50:             const context = createPrinterContext();
77:function createPrinterContext(): PrinterContext {
96:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/transient-controller.test.ts
4:import type { PrinterContext } from '../../types';
47:             const context = createPrinterContext();
74:function createPrinterContext(): PrinterContext {
93:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/wp-taxonomy-controller.test.ts
4:import type { PrinterContext } from '../../types';
64:             const context = createPrinterContext();
98:function createPrinterContext(): PrinterContext {
117:    } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/routes.test.ts
2:import type { PrinterContext } from '../../types';
7:      const context = createPrinterContext();
63:function createPrinterContext(): PrinterContext {
87:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/wp-post/identity-behaviour.test.ts
5:      createPrinterContext,
59:             const context = createPrinterContext();
132:            const context = createPrinterContext();
199:            const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/stub-handlers.test.ts
5:      createPrinterContext,
37:             const context = createPrinterContext();
108:            const context = createPrinterContext();
179:            const context = createPrinterContext();
231:            const context = createPrinterContext();
270:            const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/route-classification.test.ts
5:      createPrinterContext,
50:             const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/meta-handling.test.ts
5:      createPrinterContext,
69:             const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/wp-post/basic-controller.test.ts
5:      createPrinterContext,
77:             const context = createPrinterContext();
132:            const context = createPrinterContext();

packages/cli/src/next/builders/php/domains/__tests__/writer.test.ts
8:import type { PrinterContext } from '../../types';
18:                                             NonNullable<PrinterContext['phpDriver']>
97:                     NonNullable<PrinterContext['phpDriver']>
101:    context: PrinterContext;
112:    const context: PrinterContext = {
120:            } as unknown as PrinterContext['ir'],
130:    } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/base-controller.test.ts
2:import type { PrinterContext } from '../../types';
12:             const context = createPrinterContext();
48:function createPrinterContext(): PrinterContext {
72:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/__tests__/persistence-registry.test.ts
2:import type { PrinterContext } from '../../types';
9:              const context = createPrinterContext();
24:function createPrinterContext(): PrinterContext {
64:     } as unknown as PrinterContext;

packages/cli/src/next/builders/php/domains/wp-taxonomy/context.ts
1:import type { PrinterContext } from '../types';
17:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/wp-taxonomy/index.ts
2:import type { PrinterContext } from '../types';
12:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/resource-controller.ts
12:import type { PrinterContext } from './types';
26:     context: PrinterContext

packages/cli/src/next/builders/php/domains/transient.ts
2:import type { PrinterContext } from './types';
31:     context: PrinterContext;
45:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/index-file.ts
2:import type { PrinterContext } from './types';
15:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/printer.ts
2:import type { PrinterContext } from './types';
12:export async function emitPhpArtifacts(context: PrinterContext): Promise<void> {

packages/cli/src/next/builders/php/domains/wp-option.ts
2:import type { PrinterContext } from './types';
34:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/wp-post/context.ts
1:import type { PrinterContext } from '../types';
21:     context: PrinterContext;
38:     context: PrinterContext;

packages/cli/src/next/builders/php/domains/wp-post/index.ts
2:import type { PrinterContext } from '../types';
12:     context: PrinterContext;
```

This task feels massive but can be tackled step-by-step. Maybe I should adapt types gradually.
I'll try an incremental plan: introduce `PhpDomainContext` and update domain modules, while leaving `writer.ts` unchanged.
I should check Phase1 instructions again to confirm which modules should expose PHP code factories.

```shell
root@9d20af90c396:/workspace/wp-kernel# sed -n '1,160p' packages/cli/src/next/builders/php/domains/wp-post/index.ts
import type { IRResource } from '../../../../../ir';
import type { PrinterContext } from '../types';
import type { PhpFileBuilder } from '@wpkernel/cli/next/builders/php';
import { createWpPostContext } from './context';
import { buildWpPostMethods } from './handlers';
import type { WpPostRouteDefinition } from './types';

export type { WpPostRouteDefinition } from './types';

export function createWpPostHandlers(options: {
        builder: PhpFileBuilder;
        context: PrinterContext;
        resource: IRResource;
        routes: WpPostRouteDefinition[];
}): string[][] {
        if (options.resource.storage?.mode !== 'wp-post') {
                return [];
        }

        const context = createWpPostContext(options);
        return buildWpPostMethods(context, options.routes);
}
```

I'm considering updates to use new types like `PhpMethodTemplate`, changing return types. The plan includes adjusting modules to handle `PhpDomainContext`, though some may still need `namespaceRoot`. The shift from `builder` to `PhpProgramBuilder` is tricky, but I'll use `ProgramContext` and pass it where needed. A new interface might be required to maintain compatibility across modules.
It seems like I can minimize change by keeping `createPhpFileBuilder`, but I can't return the builder directly. Instead, I'll instantiate it and use the sub-modules. I'll still call `builder.getProgramAst()` to ensure I get the final `PhpProgram`. But the use of `appendMethodTemplates` needs to be replaced. This is tricky given time constraints, so I may have to do this in smaller steps.
I'm planning to create a `createPhpProgramFromBuilder` helper to streamline the process, avoiding `appendMethodTemplates`. I'll focus on converting `PhpMethodTemplate` nodes, using `builder.appendProgramStatement` and ensuring docblocks are handled correctly without relying on string operations. I’ll use `createClassTemplate` for setting up AST nodes.
I'll ensure doc comments go through `appendGeneratedFileDocblock` and avoid string operations. I'll update the base controller to use `createClassTemplate` and `builder.appendProgramStatement`. I'll also modify tests to expect `PhpProgram`. Time constraints may limit the scope, so I'll focus on key modules first.
