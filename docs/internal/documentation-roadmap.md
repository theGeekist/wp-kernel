# Documentation Upgrade Roadmap

This document outlines the multi-phase plan to overhaul the WP Kernel documentation. The goal is to create a comprehensive, well-structured, and user-friendly resource for both plugin developers and framework contributors.

## Phase 1: Foundational Restructuring and Tooling

This initial phase focuses on setting up the new documentation architecture, improving the tooling, and establishing this roadmap.

1.  **Create the Documentation Roadmap:**
    - This document serves as the single source of truth for the initiative.
    - The `docs/internal` directory will be excluded from the public build.

2.  **Restructure the Documentation Site:**
    - Add a new "Packages" section to the main navigation and sidebar in `docs/.vitepress/config.ts`.
    - Create a placeholder page for each package under `docs/packages/`.

3.  **Enhance API Docs:**
    - Develop and apply a strategy to improve the organization and readability of generated Typedoc API documentation (e.g., via categorization).

4.  **Contributor Guidance Update (Scoped Task):**
    - As part of the content overhaul in subsequent phases, the root `AGENTS.md` and relevant package-level planning documents will be updated to reference this roadmap. This task is recorded here to ensure it is executed incrementally as each package is addressed.

## Phase 2: `@wpkernel/core` - Setting the Standard

This phase will focus on `@wpkernel/core` to create a "gold standard" template for all other packages.

1.  **Perform a Comprehensive JSDoc Sweep:**
    - Review and update JSDoc comments for all exported APIs in `@wpkernel/core/src`.
    - Include detailed descriptions, `@category` tags, and `@example` blocks.

2.  **Create In-Depth Documentation Guides:**
    - Write guides for both Plugin Developers (usage) and Framework Developers (extensibility) under `docs/packages/core/`.

3.  **Revamp the Package README:**
    - Update `packages/core/README.md` to be a high-level entry point, linking to the new guides and API reference.

4.  **Implement Improved API Docs Generation:**
    - Apply the new Typedoc strategy from Phase 1 to `@wpkernel/core`.

## Phase 3 and Beyond: Incremental Package Rollout

Following the pattern established in Phase 2, we have updated the documentation for the remaining packages in a structured order.

1.  **`@wpkernel/ui` and `@wpkernel/cli`**
2.  **`@wpkernel/test-utils` and `@wpkernel/e2e-utils`**
3.  **PHP Packages:** `php-driver`, `php-json-ast`, and `wp-json-ast`
4.  **`@wpkernel/create-wpk`**

For each package, the process will be the same: JSDoc sweep, guide writing, README revamp, and improved API doc generation.
