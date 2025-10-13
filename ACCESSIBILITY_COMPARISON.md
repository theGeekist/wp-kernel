# Monorepo Accessibility & API Surface Comparison

This document synthesises the per-package audits for `@geekist/wp-kernel`, `@geekist/wp-kernel-cli`, `@geekist/wp-kernel-e2e-utils`, and `@geekist/wp-kernel-ui`, highlighting cross-cutting themes and contrasting their approaches to naming, composability, and accessibility.

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

- Ratify the shared error taxonomy (`KernelError` + package-specific subclasses) and publish guidance on how each package should map native errors into the shared shape.
- Ship a central constants module from the kernel (lifecycle phases, namespace tokens, canonical exit code seeds) that downstream packages can import without redefinition.
- Update documentation and ADRs to describe the shared accessibility expectations (semantic wrappers, reporter behaviours, namespace detection) so later phases inherit a stable contract.

### Phase 1 – Kernel as Source of Truth

- Implement the shared constants module and expose middleware hooks/lifecycle helpers so other packages can depend on stable APIs.
- Replace remaining plain `Error` throws in kernel resource helpers with typed errors to model the final contract.
- Document namespace detection hooks and make them overridable to unblock parallel adoption in CLI, UI, and E2E packages.

### Phase 2 – Shared Consumer Enablement (CLI & E2E Utils)

- Refactor the CLI to consume the kernel-provided constants (exit codes, lifecycle phases) and expose an extension-friendly registry factory built on the kernel middleware primitives.
- Update E2E utilities to depend on the shared error taxonomy and namespace helpers, modularising factories once the kernel exposes pure interpolation utilities.
- Align reporter and logging outputs across both packages using the cross-package observability contract from Phase 0.

### Phase 3 – UI Experience Consolidation

- Export headless controller primitives and accessible defaults that rely on the shared constants/error taxonomy, ensuring UI states mirror kernel semantics.
- Introduce documented wrappers and slots for error/empty states that consume the cross-package observability interfaces.
- Provide cleanup/mount lifecycle APIs aligned with kernel lifecycle hooks so micro-frontend teams can integrate without contract drift.
