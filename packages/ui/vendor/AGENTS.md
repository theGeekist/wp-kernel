# Vendor Snapshot Guidance

- `packages/ui/vendor/dataviews-snapshot/` stores a read-only copy of the Gutenberg `@wordpress/dataviews` sources for reference only.
- Do **not** import from this directory at runtime; always use `@wordpress/dataviews` from `node_modules`.
- Synchronise the snapshot via the upcoming `packages/ui/scripts/update-dataviews-snapshot.ts` script, recording the source commit in `README.md`.
