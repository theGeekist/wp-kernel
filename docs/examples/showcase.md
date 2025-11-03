# Showcase plugin

The showcase plugin is included with the repository so you can study a full-featured kernel project. It models a hiring portal with a single `job` resource, DataViews metadata, actions, and generated PHP controllers wired into a WordPress plugin.【F:examples/showcase/wpk.config.ts†L1-L140】

## Why this example matters

The project exercises most of the shipped surface area:

- The `job` resource defines REST routes, cache keys, query parameter descriptors, and DataViews metadata that the CLI turns into React fixtures and PHP menu shims.【F:examples/showcase/wpk.config.ts†L1-L340】【F:packages/cli/src/builders/ts.ts†L1-L200】
- Actions in `src/actions/jobs/CreateJob.ts` coordinate writes by calling the generated client, invalidating cache keys, and emitting domain events.【F:examples/showcase/src/actions/jobs/CreateJob.ts†L1-L80】
- `src/views/admin/JobsList.tsx` renders `<ResourceDataView>` against the generated runtime so you can see how the UI bindings work in practice.【F:examples/showcase/src/views/admin/JobsList.tsx†L1-L200】
- After `wpk generate` and `wpk apply`, PHP controllers live under `inc/Rest/**` and expose permission callbacks that map to the capability hints in the config.【F:examples/showcase/inc/Rest/JobController.php†L1-L200】【F:packages/cli/src/builders/php/resourceController.ts†L1-L220】

## Run it locally

```bash
pnpm install
pnpm playground:offline         # optional WordPress sandbox
pnpm --filter @examples/showcase wpk generate
pnpm --filter @examples/showcase wpk apply
pnpm --filter @examples/showcase dev
```

After `dev` starts, visit **Kernel → Showcase** in your WordPress admin. The Jobs list screen reads from the generated resource and honours the DataViews defaults declared in the kernel config.

## What to explore

1. `wpk.config.ts` - the single source of truth, including cache keys and DataViews metadata.
2. `src/resources/job.ts` - the runtime resource definition consumed by the UI.
3. `src/index.ts` - bootstraps the kernel and attaches UI bindings.
4. `inc/` - generated PHP controllers after `wpk apply`.

Use this example as a reference implementation when you structure your own plugin. It shows how the CLI output, React runtime, and PHP bridge stay aligned through the config.
