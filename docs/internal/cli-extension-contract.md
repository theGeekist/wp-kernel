# Pipeline Extension Contract

_See [Docs Index](cli-index.md) for navigation._

The extension proposal graduates the ad-hoc adapter surface into a first-class pipeline contract. Every extension package today lands in the CLI runtime, so the canonical description of the lifecycle belongs under the CLI internal docs. Housing the contract here keeps it versioned alongside the orchestrator changes and lets future tasks promote shared pieces into the `@wpkernel/pipeline` README once the package stabilises.

## Extension package shape

A deployable extension is an npm workspace that exports three entry points: the configuration factory (`wpk.config.ts`), the pipeline helpers (fragments and builders that ship through the CLI), and a runtime module that feeds hooks into the application shell. The CLI currently enforces this split by wiring the adapter extension bridge into every IR run, reading the configured factories from `wpk.config.ts`, invoking them, and normalising the returned helpers before the pipeline proceeds.【F:packages/cli/src/ir/createIr.ts†L98-L125】【F:packages/cli/src/runtime/adapterExtensions.ts†L93-L177】

Each factory receives the build options produced from the CLI invocation (`BuildIrOptions`), which include the configuration tree, workspace paths, and reporter wiring. The helpers they return must use the pipeline registration API so that dependency ordering, rollback, and diagnostics remain centralised; helpers that bypass the pipeline cannot participate in the atomic commit protocol.【F:packages/pipeline/src/createPipeline.ts†L604-L772】【F:packages/pipeline/src/extensions.ts†L49-L168】

## Lifecycle hand-off

During `pipeline.run()` the orchestrator finalises fragments, resolves builder ordering, and then pauses to execute the registered extension hooks. Hooks run with the same context object that powered the helpers and the run options derived from the CLI command. They may swap the artifact before builders execute, enqueue commit or rollback callbacks, or simply observe the run. After hooks finish, builders run, commits fire, and any rollback failures are reported back through the reporter interface.【F:packages/pipeline/src/createPipeline.ts†L817-L959】【F:packages/pipeline/src/extensions.ts†L49-L168】

The extension hook payload today is shaped by `PipelineExtensionHookOptions` in the CLI runtime. It only exposes `BuildIrOptions`, masking the broader `PipelineRunOptions` object that the core pipeline forwards. Formalising the contract means widening this interface so extensions consume the same context (`args`, `phase`, `meta`, namespace helpers, etc.) that helpers receive. The runtime already passes this data through `createExtensionHookOptions`, so the change is purely typing and ergonomics work.【F:packages/cli/src/runtime/createPipeline.ts†L128-L134】【F:packages/cli/src/runtime/types.ts†L194-L229】【F:packages/pipeline/src/createPipeline.ts†L706-L735】

## Recommended documentation updates

1. Capture the contract in this document (current step).
2. Mirror any interface or lifecycle adjustments in the generated API docs once the CLI surface matches the pipeline generics.
3. When the `TRunOptions` widening ships, add upgrade guidance to `docs/internal/cli-adapter-dx.md` so downstream extensions know which fields moved and which new context values they gain.

## Next implementation steps

To formalise the contract:

1. Update `packages/cli/src/runtime/types.ts` so `PipelineExtensionHookOptions` extends the core pipeline shape, exposing `PipelineRunOptions` instead of the build-only subset.
2. Adjust `createPipeline.ts` in the CLI runtime and associated tests to accept the widened options object and re-export the updated types for extension authors.
3. Audit internal extensions (adapter, e2e scaffolds, etc.) and documentation snippets to rely on the top-level run options instead of the nested `options` property.

Once these patches land, this page should link to the changelog entry that calls out the breaking type change and the new runtime fields exposed to third-party extensions.
