# Accessibility & Observability Contracts

This document defines the cross-package constants and behavioural norms that underpin accessibility, observability, and error semantics across the WP Kernel monorepo. All packages must consume these contracts instead of hard-coding values to avoid drift.

## Canonical TypeScript Exports

The kernel package publishes the authoritative contract constants from `@geekist/wp-kernel/contracts`.

| Contract                 | Export                          | Description                                                                                                             |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Action lifecycle phases  | `ACTION_LIFECYCLE_PHASES`       | Ordered tuple of `start`, `complete`, and `error` used to emit lifecycle events.                                        |
| WordPress hook event map | `ACTION_LIFECYCLE_EVENT_HOOKS`  | Maps lifecycle phases to canonical `wpk.action.*` hook names.                                                           |
| Kernel event bus map     | `ACTION_LIFECYCLE_BUS_EVENTS`   | Maps lifecycle phases to event bus topics (`action:start`, `action:complete`, `action:error`).                          |
| Error taxonomy           | `KERNEL_ERROR_CODES`            | Enumerates the permitted `KernelError` codes for downstream packages.                                                   |
| Namespace contract       | `KERNEL_NAMESPACE_CONTRACT`     | Provides the `wpk` root namespace and subsystem namespaces used for logging/telemetry.                                  |
| Observability channels   | `KERNEL_OBSERVABILITY_CHANNELS` | Lists the broadcast channel names and hook topics that surface lifecycle telemetry.                                     |
| CLI/base exit codes      | `KERNEL_EXIT_CODES`             | Canonical numeric exit codes (`SUCCESS`, `VALIDATION_ERROR`, `PRINTER_FAILURE`, `EXTENSION_FAILURE`) shared by tooling. |

> **Usage rule:** import these values directly from `@geekist/wp-kernel/contracts` rather than duplicating literals. Extend the constants in-place when new lifecycle phases or exit codes are introduced.

## Error Semantics

All thrown errors must be instances of `KernelError` (or subclasses) using one of the `KERNEL_ERROR_CODES` values. When wrapping lower-level errors:

1. Set `code` to the most specific enum value.
2. Preserve the original error on `data.originalError`.
3. Attach context such as `resourceName`, `actionName`, or `requestId`.

If new error scenarios emerge, extend `KERNEL_ERROR_CODES` and update the defaults in `KernelError` simultaneously to keep runtime behaviour and documentation aligned.

## Lifecycle Events

Action middleware, UI bindings, and telemetry must reference lifecycle metadata via the shared constants:

- Emit WordPress hooks with `ACTION_LIFECYCLE_EVENT_HOOKS[phase]`.
- Emit kernel bus events with `ACTION_LIFECYCLE_BUS_EVENTS[phase]`.
- Mark cross-tab payloads with `KERNEL_OBSERVABILITY_CHANNELS.broadcast.channel` and `messageType`.

New lifecycle phases **must** be added to `ACTION_LIFECYCLE_PHASES` before implementation begins so all packages can update in lockstep.

## Namespace Guarantees

Use `KERNEL_NAMESPACE_CONTRACT.framework` (`"wpk"`) as the fallback namespace for reporters and generated code. Subsystems (e.g. `wpk.actions`) come from `KERNEL_NAMESPACE_CONTRACT.subsystems`. Do not invent ad-hoc namespaces-extend this contract if additional scopes are needed.

## Exit Codes

CLI commands and other tooling must communicate process state using `KERNEL_EXIT_CODES`:

- `SUCCESS` – pipeline completed without errors (0)
- `VALIDATION_ERROR` – user input or configuration invalid (1)
- `PRINTER_FAILURE` – printers or apply steps failed (2)
- `EXTENSION_FAILURE` – adapter extensions failed or rolled back (3)

When a new exit path is required, extend `KERNEL_EXIT_CODES` and document the behaviour here before shipping changes.

## Change Control

1. Update this document and the `@geekist/wp-kernel/contracts` exports together.
2. Reference the relevant ADR/spec (e.g., `configureKernel - Specification.md`) when introducing new contracts.
3. Link downstream package READMEs and audits to the updated section so contributors immediately see the new expectations.

Keeping these artefacts in sync ensures Phase 0 (shared contracts) and Phase 1 (kernel as source of truth) remain satisfied.
