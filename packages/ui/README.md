# @wpkernel/ui

> WordPress-native UI primitives that stay aligned with WP Kernel resources, actions, and events.

## Overview

`@wpkernel/ui` supplies React components and controllers that plug directly into the kernel
runtime. Instead of bespoke data plumbing, screens consume the resource metadata defined in
`wpk.config.ts`, ensuring CLI scaffolding, runtime behaviour, and end-to-end tests stay in
sync. The package wraps WordPress-provided primitives so projects inherit the platform’s
accessibility, theming, and internationalisation guarantees.

### Core surfaces

- **`WPKernelUIProvider` / `attachUIBindings`** – share a configured runtime with React.
- **`ResourceDataView`** – render `@wordpress/dataviews` with capability guards,
  persisted preferences, and consistent async UX.
- **`createResourceDataViewController`** – translate DataViews state into resource
  queries and emit reporter events.
- **`createDataFormController`** – bind inline editors to wpk actions with automatic
  cache invalidation.
- **`ActionButton` / `useAction`** – trigger writes through Actions without touching
  transports directly.

## Quick links

- [Package guide](../../docs/packages/ui.md)
- [API reference](../../docs/api/@wpkernel/ui/README.md)
- [DataViews integration spec](./DataViews%20Integration%20-%20Specification.md)
- [Testing harness overview](../../docs/packages/test-utils.md#ui-harness)

## Installation

```bash
pnpm add @wpkernel/ui @wpkernel/core
```

### Peer dependencies

Install the matching WordPress and React peers so they are not bundled into your UI build:

- `@wordpress/components` `>=30.5.0`
- `@wordpress/data` `>=10.32.0`
- `@wordpress/dataviews` `>=9.1.0`
- `@wordpress/element` `>=6.32.0`
- `react` `>=18.0.0`

Run `pnpm lint:peers` (or `pnpm exec tsx scripts/check-framework-peers.ts`) before
publishing to confirm every workspace honours the shared peer dependency policy.

## Quick start

1. **Configure the wpk runtime**

    ```tsx
    import { configureWPKernel } from '@wpkernel/core';
    import { attachUIBindings, WPKernelUIProvider } from '@wpkernel/ui';

    const wpk = configureWPKernel({
    	namespace: 'demo',
    	registry: window.wp.data,
    	ui: {
    		attach: attachUIBindings,
    		dataviews: { enable: true, autoRegisterResources: true },
    	},
    });

    const runtime = kernel.getUIRuntime();
    ```

2. **Author a controller** (CLI generators scaffold these modules under
   `.generated/ui/registry/dataviews/`):

    ```ts
    import { createResourceDataViewController } from '@wpkernel/ui/dataviews';
    import { job } from '@/resources/job';

    export const jobDataView = createResourceDataViewController({
    	resource: job,
    	config: job.ui?.admin?.dataviews!,
    });
    ```

3. **Render the screen** with shared async boundaries and notices:

    ```tsx
    import {
    	ResourceDataView,
    	createDataFormController,
    } from '@wpkernel/ui/dataviews';
    import { jobDataView } from '@/dataviews/jobDataView';
    import { createJob } from '@/actions/Job.Create';

    const createJobForm = createDataFormController({
    	action: createJob,
    	onSuccess: ({ invalidate }) => invalidate(jobDataView.keys.list()),
    });

    export function JobsAdminScreen() {
    	return (
    		<WPKernelUIProvider runtime={runtime}>
    			<ResourceDataView
    				controller={jobDataView}
    				dataForm={createJobForm}
    				emptyState={{
    					title: 'No jobs yet',
    					description:
    						'Create the first role to publish it on the careers site.',
    					actionLabel: 'Add job',
    				}}
    			/>
    		</WPKernelUIProvider>
    	);
    }
    ```

## DataViews workflow

Define `resource.ui.admin.dataviews` in `wpk.config.ts` to keep server and client metadata
aligned. The configuration drives:

- controller scaffolding (`createResourceDataViewController` and fixtures),
- generated admin screens that mount `ResourceDataView`,
- CLI-generated interactivity helpers that wrap `createDataViewInteraction()`, and
- PHP menu shims when `screen.menu` metadata is present.

`ResourceDataView` emits `data-wpk-dataview-*` attributes so Playwright helpers can
interact with filters, search, and bulk actions deterministically. Async boundaries cover
loading, empty, error, and permission-denied states with translated defaults.

## Interactivity & automation

When `attachUIBindings()` runs, controllers registered in `.generated/ui/registry/**` become
available to both React screens and `@wordpress/interactivity` stores. The CLI also persists
DataView fixtures (`.generated/ui/fixtures/dataviews/*.ts`) and interactivity manifests for
Storybook or Playwright suites.

## Testing & validation

- Import the runtime harness from `@wpkernel/test-utils/ui` to bootstrap the kernel
  provider in unit tests.
- Extend `src/dataviews/test-support/ResourceDataView.test-support.tsx` when shared
  behaviour is missing and add accompanying self-tests before updating callers.
- E2E suites can target the emitted attributes via `@wpkernel/e2e-utils` (`kernel.dataview`).

## Contributing

Follow the [repository contribution guide](../../README.md#contributing). Keep new helpers
exported through `src/index.ts`, update the API docs via Typedoc when surfaces change, and
note any cross-package dependencies in the relevant docs.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
