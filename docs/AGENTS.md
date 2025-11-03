# Working in `/docs`

The documentation tree mirrors the state of the framework. Treat the material here as the public narrative that sits on top of the canonical specifications in the repository root. Before you edit a guide or reference page, confirm the underlying spec or README has been updated to match the behaviour you are documenting. When specs change, the `/docs` tree should be refreshed as part of the same pull request so readers never encounter conflicting guidance.

### Style and tone

Documentation follows the cadence of the WordPress Developer blog. Favour short paragraphs over bullet lists, and use headings to break up long topics so that readers can scan and land exactly where they need. Code samples should be purposeful and align with the exported TypeScript definitions-run the relevant tests or playground snippets after updating examples to ensure they still compile.

When referencing lifecycle phases, namespaces, or exit codes, link to `@wpkernel/core/contracts` rather than repeating literal values.

### Navigation and linking

Whenever you add or rename a page, update the navigation indices that reference it (for example `docs/index.md`, `docs/packages/index.md`, or guide landing pages). Prefer relative links (`../guide/actions.md`) so the site builds cleanly in all environments. If you surface a new concept in `/docs`, cross-reference the canonical source (such as `configureWPKernel - Specification.md`) so readers know where to dive deeper.

### Coordination

Large documentation updates should mention the affected pages in `docs/guide/repository-handbook.md` and call out the coverage in the pull request description. When edits touch both code and docs, run the full documentation suite (`pnpm lint --fix` if applicable, plus `pnpm typecheck:tests` when code snippets are executable) before shipping. This keeps the public narrative, root specifications, and test suite aligned.

### Versioning & Releases

- Docs describe the pre-1.0 train: **current version is v0.10.x** across all publishable packages.
- When a task in `docs/internal/cli-mvp-plan.md` lands, mirror the patch/minor bump and update every relevant changelog/migration page in the same PR.
- Remove or revise stale references to prior release numbers while keeping historical context sectioned under their respective changelog entries.

### Cross-package dependencies

If documentation work intersects with cross-package wiring (for example, guides about TypeScript paths or dependency setup), verify the steps against `docs/guide/adding-workspace-dependencies.md` so that the published guidance matches the repository practice.
