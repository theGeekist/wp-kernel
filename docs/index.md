---
layout: home
title: WPKernel
titleTemplate: A modern framework for WordPress apps

hero:
    name: WPKernel
    text: Start with one config file
    tagline: Edit `wpk.config` → run wpk generate + wpk apply
    actions:
        - theme: brand
          text: Quickstart (3 mins)
          link: /guide/quickstart
        - theme: alt
          text: Edit wpk.config.ts
          link: /guide/config
        - theme: alt
          text: Philosophy & Architecture
          link: /guide/philosophy

features:
    - title: Single source of truth
      details: One `wpk.config.ts` defines resources, capabilities, schemas, and targets. Generators build the rest.
    - title: Deterministic generation
      details: '`wpk generate` produces PHP controllers, JS hooks, types, and docs; `wpk apply` commits atomically or rolls back.'
    - title: Inline capability mapping
      details: Declare friendly capability keys once. The CLI validates, injects server checks, and emits a JS runtime map.
    - title: Ready for WordPress UI
      details: Add `ui.admin.dataviews` to create full DataViews admin screens with React, interactivity, and access control.
---

## The three-minute path

### 1 · Create a plugin workspace

```bash
npm create @wpkernel/wpk my-plugin
cd my-plugin
```

### 2 · Open `wpk.config.ts`

Declare your first resource.

```ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

const config: WPKernelConfigV1 = {
	version: 1,
	namespace: 'MyOrg\\Demo',

	resources: {
		post: {
			name: 'post',

			routes: {
				list: {
					path: '/wpk/v1/post',
					method: 'GET',
					capability: 'post.list',
				},
				get: {
					path: '/wpk/v1/post/:id',
					method: 'GET',
					capability: 'post.get',
				},
				create: {
					path: '/wpk/v1/post',
					method: 'POST',
					capability: 'post.create',
				},
			},

			capabilities: {
				'post.list': 'read',
				'post.get': 'read',
				'post.create': 'edit_posts',
			},

			ui: {
				admin: {
					view: 'dataviews',
					dataviews: { search: true },
				},
			},
		},
	},

	adapters: {},
};

export default config;
```

### 3 · Generate, then apply

```bash
wpk generate   # build PHP controllers, JS hooks, types, and UI shims
wpk apply      # transactional write (commit / rollback)
```

### 4 · Activate in WordPress

Enable your plugin and open its admin screen (it’s already capability-gated.)

::: tip What just happened?
`wpk.config.ts` became REST endpoints, capability enforcement, typed React hooks, and an optional admin UI, all without boilerplate.
:::

## Next steps

- **Edit the config** → [/guide/config](/guide/config)
- **Understand the workflow** → [/guide](/guide/index)
- **CLI reference** → [/packages/cli](/packages/cli)

### Philosophy

WPKernel follows a **config-first** principle:

- _Describe intent once._ The CLI derives artefacts deterministically.
- _Generate, don’t scaffold._ Each run syncs code, types, and enforcement from your config.
- _Stay reversible._ Every `apply` is transactional, safe to rerun, easy to roll back.
