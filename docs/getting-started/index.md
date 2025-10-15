# Introduction

WP Kernel is an opinionated framework for WordPress plugins. JavaScript stays in charge of data flow through `defineResource`, actions coordinate every write, and generated PHP controllers keep WordPress in sync without manual glue. Instead of wiring state, REST clients, and admin pages on every project, you describe the shape of your plugin once and let the tooling follow through.

## What ships out of the box

- **Resources** provide typed REST clients, cache helpers, grouped APIs, and React hooks as soon as you call `defineResource` in your project.【F:packages/core/src/resource/define.ts†L115-L390】
- **Actions** wrap every write. They surface reporters, cache invalidation, job helpers, and policy assertions through the action context so UIs never call transports directly.【F:packages/core/src/actions/define.ts†L160-L322】
- **CLI printers** live under `.generated/`. `wpk generate` emits TypeScript declarations for schemas, PHP controllers for local routes, optional DataViews scaffolding, and block registration code based on the manifests it discovers.【F:packages/cli/src/printers/index.ts†L1-L16】

When you configure adapters, the CLI can extend generation-for example the default PHP adapter writes controllers into `.generated/php` and produces a policy helper for capability checks.【F:packages/cli/src/printers/php/printer.ts†L1-L73】

## Orientation map

```mermaid
journey
    title Getting started with WP Kernel
    section Understand
      Read "Why WP Kernel?" : 5
      Skim architecture overview : 4
    section Prepare
      Follow Installation guide : 5
      Review project docs : 3
    section Build
      Complete Quick Start : 5
    section Deepen
      Explore Core Concepts : 4
      Tour Showcase plugin : 3
```

Move through the materials in that order: orient yourself, set up tooling, build something small, then deepen your understanding with the guides.

## Reads vs writes

On the read path, resources register selectors with the WordPress data store. React hooks such as `job.useList()` and `job.useGet()` call through to those selectors and keep loading and error state in sync with the cache.【F:packages/ui/src/hooks/resource-hooks.ts†L1-L120】 On the write path, actions call the resource client (`job.create`, `job.update`), emit canonical events, invalidate cache keys, and optionally enqueue background jobs. Keeping the paths separate makes instrumentation and retries consistent.

```ts
import { defineAction } from '@wpkernel/core/actions';
import { job } from '@/resources/job';

export const CreateJob = defineAction({
	name: 'Job.Create',
	handler: async (ctx, { data }) => {
		const created = await job.create(data);
		ctx.emit(job.events.created, { id: created.id });
		ctx.invalidate([job.cache.key('list')]);
		return created;
	},
});
```

## UI integration

Call `configureKernel` once during bootstrap, then hand the instance to `attachUIBindings` from `@wpkernel/ui`. That attaches resource hooks, optional DataViews runtime support, and policy bridges to the kernel instance.【F:packages/ui/src/runtime/attachUIBindings.ts†L1-L120】

```ts
import { configureKernel } from '@wpkernel/core/data';
import { attachUIBindings } from '@wpkernel/ui';
import { kernelConfig } from '../kernel.config';

export const kernel = configureKernel({ namespace: kernelConfig.namespace });
export const ui = attachUIBindings(kernel);
```

Once attached, React components can call `job.useList()` or render `<ResourceDataView>` when DataViews metadata exists in the config.【F:packages/ui/src/dataviews/resource-controller.ts†L1-L140】

## Next steps

Start with the [installation guide](/getting-started/installation) to prepare your environment, then follow the [Quick Start](/getting-started/quick-start) for the end-to-end workflow. The [Guide section](/guide/) breaks down each subsystem-resources, actions, jobs, policies, reporting-so you can dig deeper once the basics are clear.
