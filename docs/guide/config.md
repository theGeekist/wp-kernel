---
title: Edit wpk.config.ts
---

# Editing `wpk.config.ts`

`wpk.config.ts` is where a WordPress product begins.
This file doesn’t scaffold sample templates. It defines the structure of a working application. When you run the CLI, the result is not demonstration code but deploy-ready PHP, TypeScript, and optional UI that ships in production.

## The role of `wpk.config.ts`

This file acts as a bridge between intention and implementation.
You describe what your plugin should do ( its routes, capabilities, schemas, and admin surfaces ) and WPKernel takes care of how it is built. Running `wpk generate` compiles that declaration into a complete, typed, and testable stack. The code it emits is real, consistent, and designed to be extended rather than replaced.

## A first look

```ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

const config: WPKernelConfigV1 = {
	version: 1,
	namespace: 'Acme\\Jobs',

	resources: {
		job: {
			name: 'job',
			routes: {
				list: {
					path: '/acme/v1/jobs',
					method: 'GET',
					capability: 'job.list',
				},
				get: {
					path: '/acme/v1/jobs/:id',
					method: 'GET',
					capability: 'job.get',
				},
				create: {
					path: '/acme/v1/jobs',
					method: 'POST',
					capability: 'job.create',
				},
				remove: {
					path: '/acme/v1/jobs/:id',
					method: 'DELETE',
					capability: 'job.remove',
				},
			},
			capabilities: {
				'job.list': 'read',
				'job.get': 'read',
				'job.create': {
					capability: 'edit_posts',
					appliesTo: 'resource',
				},
				'job.remove': {
					capability: 'delete_posts',
					appliesTo: 'object',
					binding: 'id',
				},
			},
			identity: { type: 'number', param: 'id' },
			storage: { mode: 'wp-post', postType: 'job' },
			queryParams: {
				status: { type: 'enum', enum: ['draft', 'published'] },
				q: { type: 'string', optional: true },
			},
			ui: {
				admin: {
					view: 'dataviews',
					dataviews: {
						search: true,
						screen: {
							route: 'acme-jobs',
							menu: {
								slug: 'acme-jobs',
								title: 'Jobs',
								capability: 'manage_options',
							},
						},
						mapQuery: (state) => ({ q: state.search }),
					},
				},
			},
		},
	},

	adapters: {},
};

export default config;
```

## Version and namespace

```ts
version: 1,
namespace: 'Acme\\Jobs',
```

These two lines keep the configuration compatible across releases and set the PHP namespace for generated classes.
The namespace becomes the consistent prefix that appears across REST routes, autoloading, and client artefacts.

## Resources and routes

Each resource defines a self-contained unit with its own routes and permissions. The `routes` block represents working endpoints. When you generate the plugin, those definitions become PHP controllers registered with WordPress, complete with parameter handling and validation. The client receives the matching runtime methods and typed hooks for list, get, create, and update operations.

## Capabilities and Enforcement

Each route can be assigned a `capability`, which is then mapped to a WordPress capability in the `capabilities` object. WPKernel uses this map to generate both unbreakable server-side permission checks and a convenient client-side utility for gating UI elements.

This powerful feature ensures that your security rules, defined once, are enforced everywhere.

➡️ **Learn more in the canonical [Capabilities Guide](./capability.md).**

## Identity, storage, and data shape

The `identity` field defines how individual items are addressed, such as numeric IDs or string slugs.
The `storage` section controls how WordPress persists your data. For example, when set to `wp-post`, WPKernel generates helpers for post types, meta, statuses, and taxonomies that stay consistent with WordPress conventions.

Schemas extend this further by defining explicit data structures. They provide validation and type generation so that both your server and client share a single contract.

## Query parameters

List routes often accept query filters.
By declaring them under `queryParams`, you ensure that both your REST arguments and your client types stay aligned.

```ts
queryParams: {
	status: { type: 'enum', enum: ['publish', 'draft'] },
	search: { type: 'string', optional: true },
}
```

## Admin surfaces

If a resource includes a `ui.admin` block, WPKernel generates a ready-to-use admin interface based on DataViews.
You define the intent, not the mechanics. The generator then links your screen, routes, and capabilities so the plugin behaves like a native WordPress experience without additional wiring.

## Running and validating

When you run `wpk generate`, you’ll see which artefact groups were affected — PHP controllers, JavaScript runtimes, or UI scaffolds.
Validation runs automatically to check for missing or mismatched capability keys, ensuring secure and predictable builds.

```bash
wpk generate   # build artefacts
wpk apply      # write them atomically
```

## Real-world intent

WPKernel does not create code samples for tutorials.
It builds real plugins that are safe to deploy. Every PHP controller, capability helper, and admin screen is written to production standard from the start. This approach eliminates the usual scaffolding cycle of “generate then rewrite.” You define once, build once, and extend confidently.

## Summary

`wpk.config.ts` is the declaration that drives everything else.
Describe your resources clearly and map capabilities consistently. WPKernel will assemble a complete, typed, and enforceable WordPress layer around your declaration — a foundation you can trust and ship with.

Next: learn the philosophy behind this approach in **[Why config-first?](./philosophy.md#why-config-first)**.
