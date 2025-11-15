---
layout: home
title: WPKernel
titleTemplate: A modern framework for WordPress apps

hero:
    name: WPKernel
    text: Start with one config file
    tagline: Edit `wpk.config.ts`, run `wpk generate`, then `wpk apply`
    actions:
        - theme: brand
          text: Quickstart (3-minute setup)
          link: /#the-three-minute-path
        - theme: alt
          text: Edit your config
          link: /guide/config
        - theme: alt
          text: Philosophy & Architecture
          link: /guide/philosophy

features:
    - title: Single source of truth
      details: Define resources, capabilities, and schemas in one `wpk.config.ts`. Generators build the rest.
    - title: Deterministic generation
      details: '`wpk generate` emits PHP controllers, JS hooks, types, and docs; `wpk apply` commits atomically or rolls back.'
    - title: Inline capability mapping
      details: Declare friendly capability keys once. The CLI validates, injects server checks, and emits a runtime JS map.
    - title: Ready-made WordPress admin screens
      details: Add `ui.admin.dataviews` to get full DataViews admin screens, React, interactivity, access control included.
---

## What is WPKernel?

> **A meta-framework that brings **determinism** and **predictability** to WordPress development.**

WPKernel replaces hand-written PHP controllers, scattered JS clients, and admin-page boilerplate with a single declarative config that produces everything reliably and repeatably.

You design the entire product on a single blueprint (`wpk.config.ts`). The CLI then acts as a precision factory, generating every layer of the product: PHP, JavaScript, UI, security, to exact specifications.

## Why the Generated Artifacts Matter

> _It's a WordPress developer’s dream, finally real_

Most tools “scaffold” WordPress code.
WPKernel goes much further: it _builds_ your plugin.

Every run of `wpk generate` doesn’t just spit out files; it produces a complete, internally consistent product layer made from your single declarative config.

If you are a plugin author, here’s what that means in real life:

### 1. You define the domain once

Routes, storage, schema, capabilities, UI design, block behaviour, you describe intent in `wpk.config.ts`.

> This is the last time you write it by hand

### 2. The CLI builds all the moving parts you (probably) normally hate

- PHP REST controllers
- Capability maps + permission callbacks
- Schema-driven REST args
- DataView admin screens
- Interactivity wiring
- JS resource clients
- SSR-ready block scaffolds
- Editor modules
- Manifests, registrars, type definitions
- Patch plans and apply diffs

_…and it does this deterministically, every time._

### 3. Everything stays in sync

> No more “fix PHP, break JS” OR “route changed but block still expects the old one” OR “admin screen outdated but backend updated”.

The CLI enforces parity you simply don’t want to maintain manually.

### 4. You get production-grade code, so you only focus on the parts that matter to you.

> WordPress development burns more hours on glue, boilerplate, and synchronisation than on actual product work.

WPKernel removes that _entire category_ of suffering. :)

### 5. But what if you need something bespoke?

> You can extend the pipeline, not just the plugin.

You can build reusable extensions that plug into WPKernel’s deterministic pipeline: your branding assets, your own controllers, your paid upgrades, your internal helpers.
Use them to build the next plugin for your next client, over and over, from the same config-driven flow.

## What this really enables

Put simply, WPKernel changes what “WordPress development” even means.

- **No more spaghetti plugins and copy-pasted snippets**  
  Your `wpk.config.ts` describes the product; the CLI generates clean, structured code instead of you wiring everything by hand.
- **Security and permissions that actually line up**  
  Capability maps, permission callbacks, and REST routes all come from one source of truth, so “I forgot to protect that endpoint” becomes much harder to do.
- **A consistent workflow instead of one-off hacks**  
  Routing, storage, meta fields, admin UI, blocks, and interactivity follow the same pattern in every project. Your mental model stops resetting on each build.
- **Predictable client behaviour**  
  What you describe is what you get. Fewer “one-off tweaks” that secretly bypass capability checks or drift from the backend, fewer surprises when someone edits code in production.

This is where WordPress work stops feeling like patching a medieval craft and starts behaving like modern software engineering — with the ergonomics of a framework and the reach of the WordPress ecosystem.

## Actions-First: The Guardrail for Reliability

Our core architectural discipline is the **Actions-First Philosophy**. UI components **never** modify data directly. Instead, they invoke an Action, which acts as a central orchestrator for all write operations. This ensures:

- **Consistent Side Effects**: Every data modification follows a predictable lifecycle, including cache invalidation, event emission, and background job queuing.
- **Deterministic Logic**: By centralizing side effects, you create a robust system where critical operations are never forgotten or inconsistently applied.
- **Enhanced Testability**: Actions become isolated units of business logic, making them easier to test independently of the UI.

This "Actions-First" approach is a non-negotiable core of WPKernel, providing the guardrails necessary for building truly reliable and maintainable WordPress applications.

## The three-minute path

### 1. Create a plugin workspace

```bash
# In the wp-content/plugins folder, or develop in isolation using @wordpress/* peer dependencies
npm create @wpkernel/wpk my-plugin
cd my-plugin
```

### 2. Open `wpk.config.ts`

Declare your first resource.

```ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

const config: WPKernelConfigV1 = {
	version: 1,
	namespace: 'MyOrg\\Demo',

	resources: {
		myPost: {
			routes: {
				list: {
					path: '/myorg/v1/post',
					method: 'GET',
					capability: 'post.list', // or anything you want to call it
				},
				get: {
					path: '/myorg/v1/post/:id',
					method: 'GET',
					capability: 'post.get',
				},
				create: {
					path: '/myorg/v1/post',
					method: 'POST',
					capability: 'post.create',
				},
			},
			// map each key to a wp cap
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
};

export default config;
```

### 3. Run generate, then apply

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
- **The WPK Philosophy** [/guide/philosophy](/guide/philosophy.md)
