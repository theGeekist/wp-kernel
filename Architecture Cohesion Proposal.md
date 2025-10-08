# WP Kernel Architecture Cohesion – Findings & Recommendations

**Author:** Codex agent  
**Date:** 2025-10-08  
**Scope:** Audit of public-facing APIs described in `CURRENT_STATE.md` (capturing the present-day snapshot), alignment with the updated `configureKernel` and UI package specifications, and proposals to ensure the framework feels cohesive and symmetrical as it evolves.

---

## 1. Summary

WP Kernel already offers a clear separation between core runtime (`packages/kernel`) and presentation (`packages/ui`), with canonical abstractions for resources, actions, policies, and registry integration. However, fragmentation has crept in across bootstrap flows, naming conventions, and configuration shapes. The introduction of `configureKernel()` and the `KernelUIRuntime` is an opportunity to close the gap between “what the framework aspires to be” and the ergonomics that developers currently experience.

High-level findings:

- **Bootstrap asymmetry:** `withKernel()` handles registry/middleware wiring, while UI bindings rely on side-effects. `configureKernel()` resolves this but must become the canonical path.
- **API shape drift:** `defineResource(config)` uses an object, `defineAction(name, fn, options)` mixes positional parameters, and policy jobs follow yet another pattern. These inconsistencies make the framework feel less cohesive.
- **Event wiring and globals:** Resources and actions expose lifecycle events, but the UI package still watches globals instead of consuming an explicit runtime contract.
- **Package boundaries:** Consumers can deep import or skip namespaces entirely, which blurs modular intent.

`CURRENT_STATE.md` reflects the framework as it exists today. The recommendations below assume that snapshot as a baseline and describe the end-state ergonomics we should converge on during the upcoming iterations. The architecture is fundamentally sound-no sweeping rewrites are needed-but a handful of deliberate tweaks will make the system feel designed as one product rather than a collection of modules.

---

## 2. Audit Highlights

### 2.1 Bootstrap & Runtime

- `withKernel()` offers registry + middleware setup but lives outside the new unified bootstrap.
- UI features depend on global mutation (`__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__`), creating hidden contracts.
- Global helpers (`getWPData`, action runtime overrides) remain escape hatches without formal lifecycle control.

### 2.2 Definition APIs

- Resource, action, and policy definitions share conceptual parity but diverge in signatures and option naming.
- Jobs and reporters follow yet another naming style (`createReporter`, `defineJob` planned).
- Cache invalidation (`invalidate`) is globally scoped instead of hanging from the configured instance.

### 2.3 Observability & Events

- Reporter usage is consistent in the runtime but UI hooks create their own noop fallback.
- Events are emitted with canonical names, yet there is no typed event bus interface exposed publicly.

### 2.4 Package Structure

- `packages/ui` aspires to ship components, hooks, and primitives but only the hooks layer exists today.
- `CURRENT_STATE.md` positions `packages/ui` as a side-effect helper, contradicting the broader vision.
- Consumers can mix namespace imports (`resource.defineResource`) with flat imports (`defineResource`), increasing discoverability but also fragmentation if used inconsistently.

---

## 3. Recommendations

### 3.1 Make `configureKernel()` the Canonical Bootstrap

1. **Deprecate direct `withKernel()` usage** in favor of `configureKernel({ registry, ui: { enable } })`, exposing `kernel.attachRegistry()` for advanced cases.
2. **Expose lifecycle hooks** (`kernel.on('teardown', fn)`) so escape hatches (UI and tests) can tie into the same lifecycle without mutating globals.
3. **Ship `KernelUIRuntime` accessors** (`kernel.hasUIRuntime()`, `kernel.getUIRuntime()`) as specified, ensuring UI bindings are driven through explicit APIs.

### 3.2 Align Definition API Shapes

Adopt a unified “definition config” pattern:

| Module   | Current Signature                       | Proposed Signature                          |
| -------- | --------------------------------------- | ------------------------------------------- |
| Resource | `defineResource(config)`                | **Keep** (already object-based)             |
| Action   | `defineAction(name, fn, options?)`      | `defineAction({ name, handler, options? })` |
| Policy   | `definePolicy(map, options?)`           | `definePolicy({ map, options? })`           |
| Job      | Planned `defineJob(name, fn, options?)` | `defineJob({ name, handler, options? })`    |

Benefits:

- Consistent call sites (`kernel.defineAction({ name, handler })`) that read similarly in documentation.
- Easier migration to typed builders or contextual helpers later on.

Provide shims to keep positional signatures working with deprecation warnings.

### 3.3 Normalize Option Names & Namespacing

- Reserve `options` objects for optional parameters, `config` for required definitions, and `adapter` for integration shims.
- Ensure every definition config includes `name` and inherits the kernel namespace automatically (no local overrides).
- Document canonical event names in a single source (`packages/kernel/types/events.ts`) and export them via `kernel.events`.

### 3.4 Formalize the Event Bus

- Promote the internal event emitter to a typed `KernelEventBus` interface, surfaced through `kernel.events`.
- UI runtime subscribes to resource/action definition events instead of polling globals.
- Third-party plugins use `kernel.events.on('resource:defined', handler)` instead of relying on `wp.hooks` alone (while the `kernelEventsPlugin` keeps bridging to hooks for backwards compatibility).

### 3.5 Clarify Package Responsibilities

- Update `packages/ui` README and exports to reflect the upcoming structure (runtime, hooks, components, elements).
- Provide a `KernelUIProvider` and non-React controllers so consumers understand this package is the presentation toolkit, not merely hook glue.
- Document preferred import styles (namespace imports for module clarity) and reinforce them in examples and lint rules to avoid fragmented usage.

---

## 4. Next Steps

1. **Specification updates**
    - ✓ `configureKernel - Specification.md` revised to include `KernelUIRuntime`.
    - ✓ `UI Package Architecture Fix - Specification.md` now outlines the runtime contract.
    - 🔲 Update `CURRENT_STATE.md` once implementation lands to reflect new bootstrap flow and deprecations.

2. **Implementation roadmap**
    1. Introduce `KernelEventBus` and emit `resource:defined` / `action:defined` events.
    2. Implement `kernel.attachUIBindings()` and `KernelUIRuntime` creation; migrate UI hooks away from globals.
    3. Provide wrapper overloads for definition signatures, logging deprecation warnings for positional forms.
    4. Add lint rules/docs guiding preferred import style (`import { resource } from '@geekist/wp-kernel'` or use the configured instance).
    5. Gradually deprecate `withKernel()` in documentation, pointing developers to `configureKernel()`.

3. **Design alignments**
    - Ensure all public errors derive from `KernelError` subclasses with domain-specific codes (UI runtime should throw `UIHooksDisabledError`).
    - Review naming consistency (`KernelInstance`, `KernelUIRuntime`, `KernelEventBus`) so the framework “sounds” cohesive.

By executing these adjustments, WP Kernel will present a unified, intentional API surface while preserving compatibility and the Rails-like ergonomics the project targets.

---

## 5. Documentation Impact

- `README.md` – Refresh positioning to highlight `configureKernel()` as the default bootstrap.
- `docs/index.md` – Update the high-level architecture diagram to include the UI runtime and event bus.
- `docs/guide/data.md` / `docs/guide/actions.md` – Reflect the unified definition signatures and instance-driven APIs.
- `docs/packages/kernel.md` / `docs/packages/ui.md` – Align package responsibilities with the runtime/adapter model.
- `docs/api/index.md` and related API pages – Reorganize entries around the cohesive namespace (resources, actions, policies, events, UI runtime).
- `docs/contributing/roadmap.md` – Track migration checkpoints (event bus, definition configs, `withKernel` deprecation).

## 6. Test Impact

- Regression-test suites in `packages/kernel` and `packages/ui` must exercise both legacy and config-object definitions until deprecations are removed.
- Update mocks/helpers that patch globals to instead subscribe to `KernelEventBus` or `KernelUIRuntime`.
- Confirm end-to-end fixtures (Playwright) bootstrap via `configureKernel()` and opt into UI bindings explicitly, maintaining the existing coverage thresholds.

---

End of document.
