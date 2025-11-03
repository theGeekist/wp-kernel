# Kernel config

The kernel config is the single source of truth for your plugin. The CLI reads this file to generate TypeScript types, PHP controllers, and optional UI scaffolding. This page documents the v1 shape used by `@wpk/cli` today.【F:packages/cli/src/config/types.ts†L47-L120】

```ts
// wpk.config.ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

export const wpkConfig: WPKernelConfigV1 = {
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
					capability: 'jobs.create',
				},
			},
			storage: { mode: 'wp-post', postType: 'wpk_job' },
			identity: { type: 'number', param: 'id' },
			schema: 'auto',
			ui: {
				admin: {
					dataviews: {
						slug: 'jobs',
						title: 'Jobs',
						mapQuery: (state) => ({
							status: state.filters?.status ?? undefined,
						}),
					},
				},
			},
		},
	},
};
```

## Core fields

- **`version`** - schema version for the config. Only `1` is supported.【F:packages/cli/src/config/types.ts†L53-L75】
- **`namespace`** - prefix for generated stores, events, and PHP classes. Defaults to the plugin slug if omitted.【F:packages/cli/src/config/validate-kernel-config.ts†L184-L260】
- **`schemas`** - dictionary of schema identifiers to configuration objects. Each entry can declare where generated `.d.ts` files should live via `generated.types`.【F:packages/cli/src/config/types.ts†L19-L36】【F:packages/cli/src/builders/ts.ts†L1-L120】
- **`resources`** - dictionary of resource identifiers to `ResourceConfig` objects. Each resource mirrors the runtime definition consumed by `defineResource`.【F:packages/cli/src/config/types.ts†L31-L47】【F:packages/core/src/resource/types.ts†L187-L470】
- **`adapters`** - optional factories for PHP output or extension points. The default PHP adapter ships with the CLI and writes controllers to `.generated/php`.【F:packages/cli/src/config/types.ts†L47-L120】【F:packages/cli/src/builders/php/builder.ts†L1-L80】

## Resource options

Resources accept the same fields as `defineResource` plus a few extras for scaffolding:

- **`storage`** - describes WordPress persistence (`wp-post`, `wp-option`, `wp-taxonomy`, or `transient`). Informs the PHP builder and `wpk apply` about target directories and capabilities.【F:packages/cli/src/builders/php/resourceController.ts†L1-L120】【F:packages/cli/src/builders/php/routes.ts†L60-L170】
- **`identity`** - declares how the resource identifies items (`id`, `slug`, or `uuid`). Controls REST params and PHP lookups.【F:packages/core/src/resource/types.ts†L215-L280】【F:packages/cli/src/builders/php/resourceController.ts†L120-L220】
- **`capabilityHints`** - capability keys wired into generated controllers. Missing hints produce warnings and fall back to `manage_options`.【F:packages/cli/src/builders/php/routes.ts†L170-L260】
- **`ui.admin.dataviews`** - enables DataViews scaffolding. Provide a slug, title, and optional `mapQuery` function; the CLI serialises the metadata into `.generated/ui/fixtures/dataviews/*.ts` and emits admin menu shims when `screen.menu` is present.【F:packages/cli/src/builders/ts.ts†L1-L200】

## Schemas

Each entry in `schemas` maps a key to a JSON Schema file or descriptor:

```ts
schemas: {
        job: {
                path: './contracts/job.schema.json',
                generated: {
                        types: './src/.generated/types/job.d.ts',
                },
        },
},
```

The CLI converts schemas into `.d.ts` files under `.generated/types` (or the configured `generated.types` path) and creates an index that re-exports the PascalCase type names.【F:packages/cli/src/builders/ts.ts†L1-L200】

## Keeping configs healthy

- Run `pnpm wpk doctor` to validate the config and check Composer autoloading.【F:packages/cli/src/commands/doctor.ts†L1-L160】
- Track changes with version control-`wpk generate` prints a summary of detected deltas so you can confirm the impact before applying.【F:packages/cli/src/commands/generate.ts†L1-L360】
- When you introduce new fields, cross-check the [Decision Matrix](/reference/decision-matrix) to understand which builders will react.
