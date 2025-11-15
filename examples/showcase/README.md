# Acme Jobs Showcase (WPKernel)

This example plugin is the canonical “golden path” for validating `wpk init → generate → apply`. Each milestone in `CLI_VALIDATION.md` documents which config surfaces we exercised, which artifacts were produced, and what fixes landed along the way. Use this project to understand what the CLI ships out-of-the-box and how to extend it safely.

## Prerequisites

- Node.js 20+ with pnpm 9+
- PHP 8.1+ with Composer
- WordPress environment for manual testing (apply only rewrites PHP in this repo; you still install the plugin in your WP site)
- Git (the smoke tests snapshot workspaces)

## Getting Started

```bash
cd examples/showcase
pnpm install        # workspace dependencies
composer install    # PHP vendor tree
```

## Core Workflow

1. `pnpm generate --allow-dirty` – runs the CLI pipeline and refreshes `.generated/**`.
2. Inspect `.generated/php/**`, `.generated/ui/**`, `.generated/blocks/**`, and `.wpk/apply/plan.json` to verify the artifacts from the current milestone.
3. `pnpm apply --allow-dirty --yes` – applies the plan into `plugin.php` and `inc/**`.
4. `pnpm build` – bundles `src/index.ts` (Vite/Rollup) so WordPress can enqueue the JS.
5. Optional: `pnpm lint`, `pnpm typecheck`, `pnpm doctor --allow-dirty` to keep the repo healthy.

_Important_: `--allow-dirty` is required because the showcase intentionally carries many generated files.

## Generated Blocks & Manual Hook

`pnpm generate` now emits both the React/editor shells under `.generated/blocks/**` and the SSR plumbing in `.generated/php/Blocks` / `.generated/build/blocks-manifest.php`. Treat the JS as author-owned (safe to edit) and the PHP output as generated (rerun the CLI if you need to regenerate the registrar or manifest).

- **Manual bundler step** (tracked in `src/index.ts`): wire the generated blocks into the Vite entry so the build picks them up.

    ```ts
    import { registerGeneratedBlocks } from '../.generated/blocks/auto-register';

    registerGeneratedBlocks();
    ```

    Keep this import whenever you scaffold a new plugin - the CLI does not add it automatically yet, so forgetting it means none of the generated blocks make it to `build/index.js`.

- Enable SSR by adding `blocks: { mode: 'ssr' }` to a resource in `wpk.config.ts`. That flips on `render.php`, the registrar (`.generated/php/Blocks/Register.php`), and the manifest (`.generated/build/blocks-manifest.php`). The stub is safe to edit after generation; rerun `pnpm generate` whenever you change schema-driven fields so PHP stays in sync.
- After running `pnpm build`, confirm that the Vite output (`build/index.asset.json` + `build/index.js`) exists before applying the plugin in a WordPress site.

## Validation Log

Every milestone entry, discovery, and fix is captured in [`CLI_VALIDATION.md`](CLI_VALIDATION.md). Reference it to understand:

- Which config surfaces are currently validated
- Commands we ran at each step
- Notes about manual patches (e.g. resolving `plugin.php` conflicts, seeding plans)

## Seeds & Next Steps

Milestone 7 will refresh the seeding scripts and README again once we finalise the lean template. Until then:

- Seeds (`seeds/*.php`) still point to legacy routes - do **not** rely on them yet.
- Keep documenting new findings in the validation log before changing config.
- If you adjust manual steps (like block registration), update this README so future runs stay reproducible.
