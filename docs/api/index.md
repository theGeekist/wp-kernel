# API reference

Dive deep into the generated Typedoc for each package. Conceptual guides live under [Guide](/guide/); this section focuses on concrete APIs and types.

## Package overviews

- [`/api/@wpkernel/cli/`](./@wpkernel/cli/README.md) - CLI commands, printer contracts, wpk config loaders.
- [`/api/@wpkernel/core/`](./@wpkernel/core/README.md) - runtime helpers, error taxonomy, HTTP transport, and resource utilities.
- [`/api/@wpkernel/ui/`](./@wpkernel/ui/README.md) - UI runtime, DataViews helpers, block bindings, and React hooks.

The generated pages are excluded from local search to keep the index lean. Use your browser search or the sidebar tree to jump directly to an interface or type alias.

## Hand-written guides

Some APIs benefit from narrative explanations before you open Typedoc:

- [Resources](/guide/resources) - defining REST contracts, cache keys, and capability hints.
- [Actions](/guide/actions) - orchestrating writes and invalidation.
- [Interactivity](/guide/interactivity) - binding stateful behaviour to blocks and views.
- [Blocks](/guide/blocks) - manifests, bindings, and SSR.
- [Reporting](/guide/reporting) - working with the wpk reporter.

## Staying in sync

Whenever you regenerate Typedoc, ensure the output lands under `docs/api/*` (not `api/generated`). Update this index if you add new packages or move modules so readers have a stable entry point.
