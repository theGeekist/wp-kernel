# Release Preparation Plan

## Context

WP Kernel is approaching its first coordinated framework release without `release-please`. The work below normalizes scaffolding for new packages, centralizes framework dependency capability, and documents a manual release process so we can iterate confidently toward stable npm publication. Each task is scoped to complete in a single development cycle and includes mandatory checks.

> **Capability:** Mark the completion status for every task in the tracker below as part of the definition of done. A task is only complete once the section is updated with notes and verification details.

## Completion tracking

- [x] **Task 1 – Consolidate TypeScript/Jest scaffolding and registration**  
       Completed – shared presets (`tsconfig.lib.json`, `tsconfig.tests.json`, `tsconfig.tests.cli.json`) are in place, package configs extend them, Jest helpers live under `scripts/config/create-wpk-jest-config.ts`, the `pnpm monorepo:create|update|remove` helpers (backed by `scripts/register-workspace.ts`) wire new workspaces, and docs cover the workflow in `docs/guide/adding-workspace-dependencies.md` plus `DEVELOPMENT.md`.
- [x] **Task 2 – Centralize framework peer dependency capability and validation**  
       Completed – `scripts/config/framework-peers.ts` defines the canonical versions, `scripts/check-framework-peers.ts` validates every package, `package.json` exposes `pnpm lint:peers`, `vite.config.base.ts` reads the map for Rollup externals, and package READMEs document the capability.
- [x] **Task 3 – Document manual framework release workflow**
      Completed – Authored `docs/releases/framework-release-playbook.md`, updated `RELEASING.md`/`DEVELOPMENT.md` to point at the manual flow, added `scripts/check-release-readiness.ts` plus the `pnpm release:verify` hook, and verified the readiness check covers all publishable workspaces.
- [x] **Task 4 – Automate documentation version sync and release tagging**
      Completed – Added `pnpm release:bump` to synchronize package/docs versions and rebuild the site, introduced `scripts/release/prepare-pr.ts` behind `pnpm release:prepare-pr`, expanded the framework release playbook with release PR guidance, tagging best practices, and dry-run requirements, and verified the workflow with `pnpm lint --fix`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`, `pnpm build`, and `pnpm docs:build`.

## Task 1 – Consolidate TypeScript/Jest scaffolding and registration

**Objective:** Generate shared compiler/testing presets and automation that prevent `pnpm typecheck` / `pnpm typecheck:tests` from breaking whenever a new workspace is added.

**Implementation steps:**

1. Create repo-level presets (`tsconfig.lib.json`, `tsconfig.tests.json`, `tsconfig.tests.cli.json`) that extend `tsconfig.base.json` and encode the common `rootDir`, `outDir`, `types`, and module resolution options.
2. Replace package-specific `tsconfig*.json` files with thin wrappers that extend the presets and declare only package-relative paths.
3. Expose `createWPKJestConfig()` (TypeScript module under `scripts/config/`) that reads the root TS path aliases and emits the per-package Jest configuration.
4. Update every package/app Jest config to use the helper and delete redundant alias/transform boilerplate.
5. Add a monorepo management CLI (`pnpm monorepo:create|update|remove`, implemented in `scripts/register-workspace.ts`) that accepts a package name, generates the minimal scaffolding, and appends references to the root `tsconfig.json` plus `package.json` `typecheck`/`typecheck:tests` scripts when missing.
6. Document the workflow in `docs/guide/adding-workspace-dependencies.md` and reference the helper script in `DEVELOPMENT.md`.

**Required tooling/tests:**

- ✓ `pnpm build`
- ✓ `pnpm typecheck`
- ✓ `pnpm typecheck:tests`
- ✓ `pnpm lint --fix`
- ✓ `pnpm test`

## Task 2 – Centralize framework peer dependency capability and validation

**Objective:** Guarantee consistent peer/runtime dependency declarations across packages and prevent accidental bundling of WordPress/React modules.

**Implementation steps:**

1. Author `scripts/config/framework-peers.ts` exporting a single map of required `peerDependencies` / `devDependencies` versions for WordPress, React, and internal packages.
2. Update `vite.config.base.ts` (and any related Rollup externals) to consume the map so new dependencies stay external by default.
3. Provide a utility (`scripts/check-framework-peers.ts`) that validates each package `package.json` has the expected peers and matching versions.
4. Wire the validation script into `package.json` via `"lint:peers"` and include it in CI (e.g., run inside `pnpm lint`).
5. Refresh package README snippets (UI, Core, CLI) to describe the peer capability and installation expectations.

**Required tooling/tests:**

- ✓ `pnpm build`
- ✓ `pnpm typecheck`
- ✓ `pnpm typecheck:tests`
- ✓ `pnpm lint --fix`
- ✓ `pnpm test`
- ✓ `pnpm lint:peers`

## Task 3 – Document manual framework release workflow

**Objective:** Replace the unused `release-please` flow with an actionable manual release checklist that scales to all publishable workspaces.

**Implementation steps:**

1. Draft `docs/releases/framework-release-playbook.md` describing preflight checks (coverage thresholds, passing builds), synchronized versioning, changelog aggregation, npm publishing commands, and post-release verification.
2. Update `RELEASING.md` to reference the new playbook and clarify that `release-please` is deprecated until re-evaluated.
3. Add a CI-friendly script (`scripts/check-release-readiness.ts`) that ensures every publishable workspace defines `build`, `typecheck`, `typecheck:tests`, and shares the root version before tagging.
4. Document the script and release steps in `DEVELOPMENT.md` and add a root `pnpm release:verify` command that runs the readiness check.
5. Capture the future work item to automate npm publication in the new playbook so it remains visible once the manual steps are stable.

**Required tooling/tests:**

- ✓ `pnpm build`
- ✓ `pnpm typecheck`
- ✓ `pnpm typecheck:tests`
- ✓ `pnpm lint --fix`
- ✓ `pnpm test`
- ✓ `pnpm release:verify`

## Task 4 – Automate documentation version sync and release tagging

**Objective:** Turn the current hand-edited documentation/versioning effort into a reproducible release PR workflow that keeps docs, packages, and tags aligned before publishing to npm.

**Implementation steps:**

1. Add a root `pnpm docs:build` script that runs the existing documentation generator (`pnpm --filter docs build` if applicable) so release PRs can regenerate versioned content instead of editing hundreds of files manually.
2. Author `scripts/release/bump-version.ts` that updates the root/package versions in lockstep, rewrites any version tokens consumed by docs (e.g., `docs/**/versions.json`, CLI docs frontmatter), and then triggers `pnpm docs:build` to refresh generated pages.
3. Extend the release checklist (new section in `docs/releases/framework-release-playbook.md`) with guidance for crafting a release PR: include regenerated docs artifacts, changelog updates, and a verified `pnpm pack --dry-run` for each publishable workspace.
4. Document tagging and npm publication best practices in the playbook-e.g., use annotated tags (`git tag -a vX.Y.Z`), push tags only after npm publish succeeds, and require a second reviewer to approve the release PR before merge.
5. Provide a helper script (`scripts/release/prepare-pr.ts`) that validates the working tree is clean, runs `pnpm build`, `pnpm docs:build`, and `pnpm release:verify`, then opens a diff summary to ensure the release PR bundles only generated artifacts plus changelog/version updates.

**Required tooling/tests:**

- ✓ `pnpm build`
- ✓ `pnpm typecheck`
- ✓ `pnpm typecheck:tests`
- ✓ `pnpm lint --fix`
- ✓ `pnpm test`
- ✓ `pnpm docs:build`
