# Quick Start

Spin up a new plugin, add a resource, and run the generation workflow end to end. These steps mirror the behaviour exercised in the CLI integration tests under `packages/cli/src/commands/__tests__`.

## 1. Create a workspace and install the CLI

```bash
pnpm add -D @wpk/cli
npx wpk init my-plugin
cd my-plugin
```

`wpk init` scaffolds:

- `kernel.config.ts` with the v1 config shape (empty `resources` and `schemas`).
- `src/index.ts` that calls `configureKernel` and exports the kernel instance.
- WordPress plugin wiring (`composer.json`, `inc/bootstrap.php`) and TypeScript build config.【F:packages/cli/templates/init/kernel.config.ts†L1-L15】【F:packages/cli/templates/init/src/index.ts†L1-L14】

## 2. Define a resource

Edit `kernel.config.ts` and add at least one resource before generating. This example declares a local `job` resource with REST routes and `wp-post` storage so the PHP printers have something to emit.

```ts
import type { KernelConfigV1 } from '@wpkernel/cli/config';

export const kernelConfig: KernelConfigV1 = {
	version: 1,
	namespace: 'acme-jobs',
	schemas: {},
	resources: {
		job: {
			name: 'job',
			routes: {
				list: { path: '/acme/v1/jobs', method: 'GET' },
				get: { path: '/acme/v1/jobs/:id', method: 'GET' },
				create: {
					path: '/acme/v1/jobs',
					method: 'POST',
					policy: 'jobs.create',
				},
			},
			storage: { mode: 'wp-post', postType: 'job' },
			identity: { type: 'number', param: 'id' },
			schema: 'auto',
		},
	},
};
```

## 3. Generate and apply artifacts

```bash
pnpm wpk generate
pnpm wpk apply
```

- `wpk generate` writes `.generated/types/*.d.ts`, `.generated/php/**`, optional `.generated/ui/**`, and block registration files based on the config.【F:packages/cli/src/next/builders/ts.ts†L1-L200】【F:packages/cli/src/next/builders/php/builder.ts†L1-L80】 The command summary lists how many files were written, skipped, or removed.
- `wpk apply` copies `.generated/php/**` into `inc/` and `.generated/build/**` into `build/`, respecting `--yes`, `--backup`, and `--force` flags.【F:packages/cli/src/next/commands/apply.ts†L1-L260】

Inspect `.generated/php/Rest/JobController.php` and `inc/` after the apply step to see the generated bridge. The PHP controllers include capability guards based on `policy` hints and expose `get_rest_args()` data derived from your schema.【F:packages/cli/src/next/builders/php/resourceController.ts†L1-L220】

## 4. Attach the UI runtime

In your entry point, attach UI bindings so React components can use the generated hooks.

```ts
import { configureKernel } from '@wpkernel/core/data';
import { attachUIBindings } from '@wpkernel/ui';
import { kernelConfig } from '../kernel.config';

const kernel = configureKernel({ namespace: kernelConfig.namespace });
export const ui = attachUIBindings(kernel);
```

Once attached, components call `job.useList()` or render `<ResourceDataView>` when `ui.admin.dataviews` metadata exists in the config.【F:packages/ui/src/hooks/resource-hooks.ts†L1-L120】【F:packages/cli/src/next/builders/ts.ts†L1-L200】

## 5. Iterate in watch mode

```bash
pnpm wpk start
```

`wpk start` watches `kernel.config.*`, `contracts/**`, `schemas/**`, and your source tree. When files change it reruns the builders and proxies Vite output from the current project so the admin UI reloads automatically.【F:packages/cli/src/next/commands/start.ts†L1-L320】 Use `--auto-apply-php` to copy PHP artifacts on every cycle when you trust the diff.

You have now run the full loop: configure → generate → apply → start. Each change to `kernel.config.ts` feeds the same builders, so the generated PHP, TypeScript, and UI scaffolding stay in sync.
