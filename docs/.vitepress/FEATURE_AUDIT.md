# WP Kernel Feature Audit (October 2025)

## Executive Summary

WP Kernel's core runtime, UI adapter, and CLI pipeline are feature-complete for generating and running a resource-driven WordPress plugin. The runtime wires registry middleware, cache invalidation, event emission, and optional UI bindings behind a single `configureWPKernel` entry point.【F:packages/core/src/data/configure-kernel.ts†L92-L220】 Generated resources raise typed events through a shared bus so both JavaScript and PHP surfaces stay synchronised.【F:packages/core/src/events/bus.ts†L36-L160】 The CLI currently generates TypeScript definitions, PHP controllers, UI bindings, and block builds in one pass, then applies artefacts with guarded merges and block deployment tracking.【F:packages/cli/src/printers/index.ts†L1-L17】【F:packages/cli/src/printers/php/printer.ts†L1-L92】【F:packages/cli/src/commands/apply/command.ts†L21-L156】 Extensive unit coverage exercises the registry bootstrap, cache integration, and apply workflow, keeping day-to-day development stable.【F:packages/core/src/data/**tests**/configure-kernel.test.ts†L51-L216】【F:packages/cli/src/commands/**tests**/apply-command.test.ts†L51-L200】

## Current Implementation Snapshot

### Core Runtime

- `configureWPKernel` centralises namespace detection, reporter wiring, middleware installation, cache invalidation, event emission, UI attach, and teardown safety guards, enabling a one-call bootstrap for plugins.【F:packages/core/src/data/configure-kernel.ts†L92-L220】
- Resources defined with `defineResource` automatically receive grouped APIs, namespace-aware reporters, cache keys, and event registration, reinforcing the "JS is source of truth" contract.【F:packages/core/src/resource/define.ts†L1-L120】【F:packages/core/src/events/bus.ts†L139-L160】
- Actions expose policy checks, cache invalidation, job orchestration, and canonical events inside a consistent context, so UI layers never issue transport calls directly.【F:packages/core/src/actions/define.ts†L160-L320】

### UI Integration

- `attachUIBindings` augments a configured kernel with policy runtime discovery, DataViews controllers, and automatic hook registration for every resource that becomes available at runtime.【F:packages/ui/src/runtime/attachUIBindings.ts†L1-L184】
- The generated UI runtime auto-registers DataViews controllers when metadata is present, bridging resource definitions to `<ResourceDataView>` and hook consumption without bespoke glue code.【F:packages/ui/src/runtime/attachUIBindings.ts†L78-L183】【F:packages/ui/src/dataviews/resource-controller.ts†L1-L140】

### CLI Workflow

- `wpk generate` emits type definitions, PHP controllers, UI scaffolds, and block assets during a single invocation, coordinating adapters via a shared printer context.【F:packages/cli/src/printers/index.ts†L1-L17】
- The PHP printer skips remote-only resources, warns when policies are missing, and writes persistence registries and policy helpers alongside controller classes, ensuring parity with config metadata.【F:packages/cli/src/printers/php/printer.ts†L12-L92】
- `wpk apply` merges generated PHP and block artefacts into the working plugin, preserving manual regions and logging a breakdown so teams can audit deployments.【F:packages/cli/src/commands/apply/command.ts†L21-L156】 Tests cover guarded merges, block manifests, and error reporting to keep the workflow predictable.【F:packages/cli/src/commands/**tests**/apply-command.test.ts†L51-L200】
- `wpk start` watches kernel sources, regenerates artefacts on change, and runs the Vite dev server with debounced triggers and safe shutdown hooks, giving authors a full-stack watch mode.【F:packages/cli/src/commands/start.ts†L1-L200】

### Reference Implementations

- The showcase plugin demonstrates the full stack—kernel config, resource clients, UI DataViews, actions, and generated PHP controllers—proving the workflow in a real WordPress project.【F:docs/examples/showcase.md†L1-L33】【F:examples/showcase/src/actions/jobs/CreateJob.ts†L14-L63】
- The "Test the CLI" example keeps a minimal transient-backed resource for smoke-testing generation and apply routines without unrelated noise.【F:docs/examples/test-the-cli.md†L1-L27】【F:examples/test-the-cli/wpk.config.ts†L1-L48】

## Planned & In-Flight Work

- The CLI MVP roadmap enumerates phases covering IR metadata, block discovery, PHP printer enhancements, block-aware apply, command surface refresh, integration harness, policy integration, and final documentation/export hygiene.【F:packages/cli/MVP-PHASES.md†L1-L511】 Each phase lists scope, dependencies, and expected deliverables, ensuring ongoing work remains incremental.
- Documentation already reflects the streamlined workflow: Getting Started highlights resource APIs, action orchestration, and CLI generation behaviour validated against the codebase.【F:docs/getting-started/index.md†L1-L69】 Example guides now point to the showcase walkthrough and CLI smoke test to steer contributors toward canonical usage patterns.【F:docs/examples/index.md†L1-L15】

## Critical Outstanding Items for MVP

- Phase 8B of the CLI plan—final QA, documentation audit, end-to-end init → apply validation, and release packaging—remains marked as pending and is the gating item for a formal MVP launch.【F:packages/cli/MVP-PHASES.md†L472-L511】 Delivering this phase will confirm regenerated showcase artefacts, coverage targets, and release communication.
- Policy integration relies on the generated helper and diagnostics outlined in Phase 7; although the printer emits policy helpers today, we still need the IR detection and warnings from that phase to prevent silent misconfiguration during launch.【F:packages/cli/MVP-PHASES.md†L341-L370】【F:packages/cli/src/printers/php/printer.ts†L12-L92】
- Integration harness coverage across `wpk generate`, `apply`, `start`, and `build` must remain healthy; any regressions in these command-level suites would block MVP readiness, so ongoing verification is critical while the final QA phase is open.【F:packages/cli/MVP-PHASES.md†L381-L441】【F:packages/cli/src/commands/**tests**/apply-command.test.ts†L51-L200】

## Documentation Delta on This Branch

- The Getting Started entry now anchors every promise—resources, actions, CLI printers, and UI integration—with inline references to the actual implementations, replacing older narrative sections that lacked code links.【F:docs/getting-started/index.md†L1-L69】
- Example guides were rewritten to document the showcase and CLI smoke-test plugins that ship in-repo, providing readers direct navigation to the validated configs and generated assets.【F:docs/examples/index.md†L1-L15】【F:docs/examples/showcase.md†L1-L33】【F:docs/examples/test-the-cli.md†L1-L27】

## Release Readiness Assessment

The core packages behave reliably under test—the bootstrap suite verifies middleware teardown, registry fallbacks, cache invalidation, and event emission, while CLI command suites cover guarded merges, block deployment, and error handling.【F:packages/core/src/data/**tests**/configure-kernel.test.ts†L51-L216】【F:packages/cli/src/commands/**tests**/apply-command.test.ts†L51-L200】 The feature surface exercised by the showcase plugin confirms the stack is viable for complex admin experiences.【F:docs/examples/showcase.md†L1-L33】 However, because the final QA and release-readiness checklist in Phase 8B remains open, we cannot yet consider the product ready for an external MVP or beta announcement. Completing that phase—regenerating artefacts, verifying docs, and packaging release notes—will provide the confidence we need to invite beta adopters.
