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
          link: /guide/quickstart#the-three-minute-path
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
    - title: Ready for WordPress UI
      details: Add `ui.admin.dataviews` to get full DataViews admin screens, React, interactivity, access control included.
---

## What is WPKernel?

Imagine building a high-end appliance. Instead of dozens of workers manually hammering parts with variable results, you design the entire product on a single blueprint (`wpk.config.ts`). The factory machinery (the WPKernel CLI and generator) then produces every component: PHP, JavaScript, UI, security, to exact specifications through a strict assembly line.

Need a custom machine on that floor? Ad an extension hook: isolated and reversible.

This is WPKernel: a framework that brings **determinism** and **predictability** to WordPress development, transforming an often-chaotic process into a streamlined, reliable one.

## Solving WordPress Developer Pain Points

WordPress's flexibility is its strength, but that often leads to inconsistent code, security vulnerabilities, and maintenance headaches. WPKernel directly addresses these critical pain points:

- **No More Spaghetti Code or Plugin Bloat**: WPKernel enforces a clear separation of concerns. Your `wpk.config.ts` defines your application's intent, and the CLI generates clean, structured code. This eliminates the need for dozens of conflicting plugins and reduces the "spaghetti PHP" often found in custom solutions.
- **Robust Security and Reliability**: By generating server-side permission checks and client-side utilities from a single source of truth, WPKernel drastically reduces security vulnerabilities. Updates become less fragile, as the generated code adheres to consistent standards, minimizing unexpected breaks.
- **Streamlined Tooling and Workflow**: WPKernel simplifies dependency management, custom routing, and meta-field definitions. It provides a consistent development experience, moving away from global state reliance and making your logic easier to test and understand.
- **Predictable Client Interactions**: With a deterministic generation process, what you define is what you get. This reduces layout breaks from client "tweaks" and helps manage expectations by providing a clear, consistent foundation for your application.

## Actions-First: The Guardrail for Reliability

A core architectural discipline in WPKernel is the **Actions-First Philosophy**. UI components **never** modify data directly. Instead, they invoke an Action, which acts as a central orchestrator for all write operations. This ensures:

- **Consistent Side Effects**: Every data modification follows a predictable lifecycle, including cache invalidation, event emission, and background job queuing.
- **Unbreakable Logic**: By centralizing side effects, you create a robust system where critical operations are never forgotten or inconsistently applied.
- **Enhanced Testability**: Actions become isolated units of business logic, making them easier to test independently of the UI.

This "Actions-First" approach is a non-negotiable core of WPKernel, providing the guardrails necessary for building truly reliable and maintainable WordPress applications.

## The three-minute path

### 1 Create a plugin workspace

```bash
npm create @wpkernel/wpk my-plugin
cd my-plugin
```

### 2 Open `wpk.config.ts`

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

### 3 · Run generate, then apply

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

WPKernel follows a **config-first** [principle](/guide/philosophy.md):

- _Describe intent once._ The CLI derives artefacts deterministically.
- _Generate, don’t scaffold._ Each run syncs code, types, and enforcement from your config.
- _Stay reversible._ Every `apply` is transactional, safe to rerun, easy to roll back.
