# Foundation package proposal

WP Kernel currently treats `@wpkernel/core` as both the contract surface and the opinionated runtime. That coupling makes it hard to let the IR, pipeline engine, or PHP AST evolve as independent workspaces. This note outlines how a new foundation package can absorb the shared primitives while today’s core package transitions into a client/runtime bundle.

## Rename the runtime package

The existing `packages/core` workspace would be renamed to `@wpkernel/client`. The module would continue to export the runtime helpers-resource execution, policy wiring, pipeline orchestration, and registry adapters. Its public API stays focused on delivering a ready-to-run kernel for WordPress hosts.

Renaming the package avoids overstating its responsibility. Downstream packages that actually need the runtime keep depending on the renamed distribution, but consumers that only reach for shared types gain an alternative.

## Introduce a contracts-first core

A new `@wpkernel/core` workspace would own four top-level entry points:

- `@wpkernel/core/contracts` for lifecycle phases, registry namespaces, and configuration interfaces.
- `@wpkernel/core/types` for DTOs and generics that describe resources, adapters, and builder inputs without shipping implementations.
- `@wpkernel/core/errors` for `KernelError` and the canonical subclasses used across the ecosystem.
- `@wpkernel/core/namespaces` for helpers that normalise identifiers, file paths, and PHP namespaces.

Each entry point would expose an `index.ts` that re-exports focused modules. Packages like the CLI and php-json-ast can pull contracts from these paths without importing the runtime container or any Node.js-specific helpers.

## Isolate the pipeline

The pipeline engine continues to live in the renamed `@wpkernel/client`, but its public types move into the new core package. A future iteration could promote the engine implementation into its own workspace once the contract boundary stabilises. For now the runtime would import the shared types from the foundation layer, preserving one-way dependencies.

Consumers that only need the pipeline signatures-such as a standalone AST builder-depend on `@wpkernel/core` and supply their own execution strategy. CLI commands keep using the runtime engine until the standalone package materialises.

## Implications for IR and AST packages

With the shared contracts isolated, the IR builder (`@wpkernel/ir`) can shape its inputs without inheriting runtime baggage. Resource identities, cache key descriptors, and builder environments become plain interfaces imported from `@wpkernel/core/types`. The package can accept host-provided callbacks for workspace writes, letting the CLI remain a thin orchestrator.

Likewise, the PHP AST ecosystem can split into transport-agnostic factories and WordPress-specific helpers. Both depend on the foundation package for error types and namespace helpers, so they agree on diagnostics and emitted identifiers even when used outside the CLI.

## Migration checklist

1. Catalogue every symbol other packages import from `@wpkernel/core` today. Classify them as contract, DTO, or runtime.
2. Create the new foundation workspace with the four entry points above and move the contract/DTO exports there.
3. Update internal packages to resolve contracts from `@wpkernel/core` and runtime helpers from the renamed `@wpkernel/client`.
4. Provide a compatibility re-export in the old package name during the migration window so downstream consumers can update incrementally.
5. Once all internal packages have flipped, deprecate the compatibility layer and publish guidance for external adopters.

This split keeps shared contracts truly runtime-independent while leaving space for future packages-IR, pipeline, AST-to expand beyond the CLI’s current needs.
