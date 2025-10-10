# @wordpress/dataviews snapshot

This directory contains a read-only snapshot of the Gutenberg `@wordpress/dataviews`
package so cloud agents that cannot access the symlinked Gutenberg repository still
have contextual source files and type information while working on the DataViews
integration. **Runtime code must continue importing from `@wordpress/dataviews`
via `node_modules`; nothing in the vendor snapshot should be imported at runtime.**

- Source repository: https://github.com/WordPress/gutenberg
- Package path: `packages/dataviews`
- Snapshot commit: `d4159040f6697183f07b1f8a557c4d052fcb2f8c`
- Snapshot date: 2025-03-17

> ⚠️ The files under `dataviews-snapshot/` must not be edited directly or imported by
> UI components. Update them by re-syncing from Gutenberg and re-running the import
> script once Phase updates require a newer upstream reference.

Helper scripts:

- `pnpm --filter @geekist/wp-kernel-ui update:dataviews-snapshot` (to be implemented in later phases) will refresh the snapshot automatically.
