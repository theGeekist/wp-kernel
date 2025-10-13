# Monorepo Accessibility & API Surface Comparison

This document synthesises the per-package audits for `@geekist/wp-kernel`, `@geekist/wp-kernel-cli`, `@geekist/wp-kernel-e2e-utils`, and `@geekist/wp-kernel-ui`, highlighting cross-cutting themes and contrasting their approaches to naming, composability, and accessibility.

## Audit Reference Index

- [Kernel audit – Phased Work Plan](packages/kernel/ACCESSIBILITY_AUDIT.md#phased-work-plan)
- [CLI audit – Phased Work Plan](packages/cli/ACCESSIBILITY_AUDIT.md#phased-work-plan)
- [E2E utilities audit – Phased Work Plan](packages/e2e-utils/ACCESSIBILITY_AUDIT.md#phased-work-plan)
- [UI audit – Phased Work Plan](packages/ui/ACCESSIBILITY_AUDIT.md#phased-work-plan)

Use these anchors when you need deeper package-specific rationales, example code, or remediation detail before scheduling implementation work.

## Summary Table

| Package                        | Accessibility Strengths                                                                | Primary Gaps                                                                                 | Extensibility Outlook                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `@geekist/wp-kernel`           | Strong error normalisation, lifecycle instrumentation hooks, cohesive resource helpers | Stringly-typed lifecycle phases, mixed error semantics in cache helpers, singleton event bus | High once middleware/story is exposed; currently tightly coupled to core orchestrators |
| `@geekist/wp-kernel-cli`       | Consistent Clipanion commands, namespaced reporters, programmatic `runCli`             | Fixed command registry, scattered exit codes, limited help UX                                | Medium; requires registry factory and shared constants                                 |
| `@geekist/wp-kernel-e2e-utils` | Single factory entry, Playwright fixture integration, descriptive examples             | Plain Error usage, implicit namespace detection, mixed helper concerns                       | Medium-High with modularisation and richer typing                                      |
| `@geekist/wp-kernel-ui`        | Clear provider contract, DataViews integration, configurable states                    | Reliance on consumer markup for semantics, limited error slots, monolithic component         | High if headless primitives and documented patterns are added                          |

## Cross-Package Patterns

- **Error Handling:** Kernel and CLI packages lean on structured reporters, yet only the kernel ensures custom error types. E2E and UI packages still emit plain `Error`s or rely on component defaults. Harmonising error surfaces would aid debugging across the stack.
- **Naming Conventions:** Verb-first exports for actions/commands are consistent across packages. UI hooks follow React conventions, while CLI helpers mix named and default exports. Establishing a monorepo-wide guideline (verb exports, named modules) would reduce cognitive load.
- **Context & Runtime Access:** Both UI and E2E packages provide context factories (`KernelUIProvider`, `createKernelUtils`). Kernel itself hides namespace detection inside action definition. Exposing parallel context APIs in the kernel would let other packages plug in instrumentation symmetrically.

## Accessibility Themes

- **UI vs Non-UI:** Only `@geekist/wp-kernel-ui` renders DOM nodes, delegating semantics to `@wordpress/dataviews`. Accessibility hinges on consumer-provided wrappers. Documentation should underscore this, and shared accessible defaults would help align behaviour.
- **Developer Ergonomics:** CLI and kernel surfaces are accessible primarily via consistent naming and examples. However, lack of exported constants (lifecycle phases, exit codes) introduces friction. Providing typed constants improves both TypeScript ergonomics and documentation clarity.
- **Observability:** Kernel emits lifecycle events; CLI emits reporter messages; E2E utilities expose event recorders. These mechanisms are siloed. Creating a shared observability contract (e.g., typed events + reporter adapters) would align accessibility for debugging workflows.

## Composability & Future-proofness

- **Middleware Opportunities:** Kernel actions already hint at middleware via `createActionMiddleware`. Extending this pattern to CLI command pipelines and E2E helpers would make cross-cutting concerns (logging, telemetry, auth) easier to integrate.
- **Headless Primitives:** UI package could export headless controllers, while E2E utilities could expose pure helpers. This would let other packages compose new experiences without DOM coupling.
- **Namespace Strategy:** Namespace detection is implicit in kernel and E2E packages but explicit in UI runtime providers. Aligning on a shared namespace resolution interface would simplify multi-tenant deployments and accessibility audits.

## Portfolio-level Recommendations

1. **Standardise Error Types:** Adopt `KernelError` (or package-specific subclasses) across all packages to ensure consistent serialization and logging.
2. **Publish Shared Constants:** Provide canonical lifecycle phase, exit code, and namespace constants from the kernel package for reuse in CLI, UI, and E2E layers.
3. **Document Accessibility Contracts:** Expand documentation to explain responsibilities at each layer (e.g., UI consumers must supply semantic wrappers, CLI commands should document exit codes).
4. **Invest in Middleware/Headless APIs:** Prioritise composable primitives so future teams can extend functionality without duplicating orchestration logic.

## Cross-Package Phased Roadmap

### Phase 0 – Establish Monorepo Accessibility Contracts

**Status:** `<complete>` – Shared constants are codified in [contracts/ACCESSIBILITY_CONTRACTS.md](contracts/ACCESSIBILITY_CONTRACTS.md) and exported via [`@geekist/wp-kernel/contracts`](packages/kernel/src/contracts/index.ts). Package READMEs now expose dedicated “Accessibility contracts & constants” sections so contributors know where to find lifecycle, namespace, error, and exit-code definitions before beginning work.

- **Contract sources:**
    - [Accessibility & Observability Contracts](contracts/ACCESSIBILITY_CONTRACTS.md) – normative reference and change protocol.
    - [Kernel README § Accessibility contracts & constants](packages/kernel/README.md#accessibility-contracts--constants) – how runtime developers should consume the exports.
    - [CLI README § Accessibility contracts & constants](packages/cli/README.md#accessibility-contracts--constants) – guidance for scaffolding and reporter integrations.
    - [E2E utilities README § Accessibility contracts & constants](packages/e2e-utils/README.md#accessibility-contracts--constants) – instructions for Playwright fixtures and assertions.
    - [UI README § Accessibility contracts & constants](packages/ui/README.md#accessibility-contracts--constants) – expectations for UI controllers and semantic defaults.
- **Update protocol:** When contracts evolve, update both the Markdown reference and `@geekist/wp-kernel/contracts` exports. Leave this phase at `<pending>` until each README and audit cross-links the new contract details.

### Phase 1 – Kernel as Source of Truth

**Status:** `<complete>` – The kernel publishes lifecycle, namespace, error, and exit-code constants from [`packages/kernel/src/contracts/index.ts`](packages/kernel/src/contracts/index.ts) so downstream packages can import a single source of truth. Readmes and audits instruct teams to rely on these exports before extending middleware or observability hooks.

- **Implementation checklist:**
    - Follow [Kernel audit Phase 1 guidance](packages/kernel/ACCESSIBILITY_AUDIT.md#phase-1--harden-kernel-primitives) and import the contract exports when refactoring lifecycle or namespace code.
    - Align CLI observability with the kernel constants by consulting [CLI audit Phase 1 guidance](packages/cli/ACCESSIBILITY_AUDIT.md#phase-1--enable-extensible-registries) and consuming `KERNEL_EXIT_CODES`.
    - Capture namespace override details in [Kernel README § Accessibility contracts & constants](packages/kernel/README.md#accessibility-contracts--constants) before mirroring integration notes in downstream READMEs.
- **Contract storage:** Keep living specifications in `contracts/` and reference them from package audits whenever new middleware or observability hooks are proposed.

### Phase 2 – Shared Consumer Enablement (CLI & E2E Utils)

**Status:** `<pending>` – Update to `<in-progress>` once CLI and E2E engineering formally start. Record implementation artefacts in the package READMEs and audits, referencing where exit code/constants integration work can be reviewed.

- Refactor the CLI to consume the kernel-provided constants (exit codes, lifecycle phases) and expose an extension-friendly registry factory built on the kernel middleware primitives.
- Update E2E utilities to depend on the shared error taxonomy and namespace helpers, modularising factories once the kernel exposes pure interpolation utilities.
- Align reporter and logging outputs across both packages using the cross-package observability contract from Phase 0.

### Phase 3 – UI Experience Consolidation

**Status:** `<pending>` – Toggle to `<in-progress>` when UI and DX teams kick off. Reference `packages/ui/README.md` and the UI audit before marking as `<complete>`; note any additional accessibility contracts in the audit.

- Export headless controller primitives and accessible defaults that rely on the shared constants/error taxonomy, ensuring UI states mirror kernel semantics.
- Introduce documented wrappers and slots for error/empty states that consume the cross-package observability interfaces.
- Provide cleanup/mount lifecycle APIs aligned with kernel lifecycle hooks so micro-frontend teams can integrate without contract drift.

## Package README Reference Guide

| Package                        | Key README Sections                                                                                                                                                                                                                                                                                                      | When to Consult                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `@geekist/wp-kernel`           | [Overview](packages/kernel/README.md#overview), [Quick Start](packages/kernel/README.md#quick-start), [Key Patterns](packages/kernel/README.md#key-patterns), [Accessibility contracts & constants](packages/kernel/README.md#accessibility-contracts--constants)                                                        | Understand runtime contracts, lifecycle primitives, and namespace conventions before altering core behaviour. |
| `@geekist/wp-kernel-cli`       | [Overview](packages/cli/README.md#overview), [Core workflow: init → generate → apply](packages/cli/README.md#core-workflow-init--generate--apply), [Development commands](packages/cli/README.md#development-commands), [Accessibility contracts & constants](packages/cli/README.md#accessibility-contracts--constants) | Align CLI work with the generation pipeline, exit code expectations, and recommended developer flows.         |
| `@geekist/wp-kernel-e2e-utils` | [Overview](packages/e2e-utils/README.md#overview), [Key Features](packages/e2e-utils/README.md#key-features), [Validation Strategy](packages/e2e-utils/README.md#validation-strategy), [Accessibility contracts & constants](packages/e2e-utils/README.md#accessibility-contracts--constants)                            | Plan test utilities and fixtures that honour shared contracts and observability patterns.                     |
| `@geekist/wp-kernel-ui`        | [Overview](packages/ui/README.md#overview), [Bootstrapping the runtime](packages/ui/README.md#bootstrapping-the-runtime), [DataViews in practice](packages/ui/README.md#dataviews-in-practice), [Accessibility contracts & constants](packages/ui/README.md#accessibility-contracts--constants)                          | Ensure UI integrations respect kernel bootstrapping, accessibility defaults, and DataViews controllers.       |

Keep this table in sync with README updates so contributors can discover the authoritative guidance for contract changes and implementation steps.
