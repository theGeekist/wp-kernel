## Guide: The anatomy of `wpk.config.ts`

### 1. Here's a minimal but valid config

```ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

export const wpkConfig: WPKernelConfigV1 = {
	version: 1,
	namespace: 'acme-demo',
	// meta: {
	// 	name: 'Acme Demo Plugin',
	// 	description:
	// 		'Bootstrap loader for the Acme Demo Plugin WPKernel integration.',
	// },
	schemas: {},
	resources: {},
	adapters: {},
};
```

**What this does**
The `version` property locks behaviour to a known schema, `namespace` sets PHP class roots, REST base, and client store prefixes. This is how parity between PHP & JS is ensured.
Empty registries are perfectly valid but _builders_ only generate assets when these are filled out. The optional `meta` block overrides plugin header fields in `plugin.php`; omit it to inherit defaults derived from `namespace`.

::: info Tip

> - In WPKernel, a **_builder_** generates files for use in the project.
> - You can rename namespace later and generated paths and symbol names will move with it.

:::

### 2. A resource with real routes and WP Capability checks

```ts
resources: {
	job: {
		name: 'job',
		routes: {
			list:   { path: '/acme/v1/jobs',     method: 'GET',  capability: 'job.list'  },
			get:    { path: '/acme/v1/jobs/:id', method: 'GET',  capability: 'job.get'   },
			create: { path: '/acme/v1/jobs',     method: 'POST', capability: 'job.create'},
		},
		capabilities: {
			'job.list':  'read',
			'job.get':   'read',
			'job.create': { capability: 'edit_posts', appliesTo: 'resource' },
		},
	},
},
```

**What builders do**
The route planner records `list`, `get` and `create`. PHP builders then generate `REST`ful controllers with permission callbacks and JS builder emits a typed API client with `fetchList`, `fetch` and `create`.
This is a brief overview. For a deep dive into these concepts, see the canonical guides: - **[Resources Guide](/guide/resources)** - **[Capabilities Guide](/guide/capability)**

**What you get**

- `.generated/php/Rest/JobController.php`
- `.generated/js/resources/job.ts`
- `.generated/js/capabilities.ts`

::: info Tip

> - If a `capability` is missing, the CLI warns but still applies `manage_options` for that route, so that built assets remain valid with some sane defaults while you finish the map.

:::

This only scratches the surface of what WPKernel infers from the config today. In the appendix below, we list the full range of options driven entirely by the config file.
