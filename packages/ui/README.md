# @wpkernel/ui

> WordPress-native UI primitives that stay aligned with WP Kernel resources, actions, and events.

## Overview

This package exposes UI building blocks that lean on the kernel runtime instead of bespoke data plumbing. Major surfaces include:

- **ResourceDataView** - render `@wordpress/dataviews` with kernel-aware controllers, capability gating, and persisted preferences.
- **createResourceDataViewController** - translate DataViews state (search, filters, sort, pagination) into resource queries and event payloads.
- **createDataFormController** - pair inline editors with kernel actions and automatic cache invalidation.
- **ActionButton / useAction** - trigger kernel actions from the UI without touching transports directly.
- **WPKernelUIProvider** - share the bootstrapped runtime with React components.

All runtime imports come from published packages (`@wordpress/dataviews`, `@wordpress/components`) while this repository mirrors their types and wiring. The snapshot under `packages/ui/vendor/` is reference-only.

## Installation

```bash
pnpm add @wpkernel/ui @wpkernel/core
```

Install the matching WordPress and React peers to avoid bundling them into the
UI build:

- `@wordpress/components` `>=30.5.0`
- `@wordpress/data` `>=10.32.0`
- `@wordpress/dataviews` `>=9.1.0`
- `@wordpress/element` `>=6.32.0`
- `react` `>=18.0.0`

Run `pnpm lint:peers` to confirm every workspace honours the shared capability in
`scripts/check-framework-peers.ts` before publishing.

## Bootstrapping the runtime

```tsx
import { configureWPKernel } from '@wpkernel/core';
import { attachUIBindings, WPKernelUIProvider } from '@wpkernel/ui';
import { job } from '@/resources/job';

const kernel = configureWPKernel({
	namespace: 'demo',
	registry: window.wp.data,
	ui: {
		attach: attachUIBindings,
		dataviews: {
			enable: true,
			autoRegisterResources: true,
		},
	},
});

const runtime = kernel.getUIRuntime();

const App = () => (
	<WPKernelUIProvider runtime={runtime}>
		{/* screens render ResourceDataView with controllers */}
	</WPKernelUIProvider>
);
```

## DataViews in practice

1. **Describe the view in your resource config** so CLI generators and the runtime can discover it:

```ts
export const job = defineResource<Job, JobQuery>({
	name: 'job',
	routes: {
		/* … */
	},
	ui: {
		admin: {
			dataviews: {
				preferencesKey: 'jobs/admin',
				mapQuery: ({ search, filters, sort, page, perPage }) => ({
					q: search,
					department: filters.department,
					orderBy: sort?.field ?? 'created_at',
					order: sort?.direction ?? 'desc',
					page,
					perPage,
				}),
				defaultLayouts: {
					table: { density: 'compact' },
				},
				views: [
					{
						id: 'all',
						label: 'All jobs',
						isDefault: true,
						view: {
							type: 'table',
							fields: ['title', 'status', 'department'],
						},
					},
					{
						id: 'published',
						label: 'Published jobs',
						view: {
							type: 'table',
							filters: [
								{
									field: 'status',
									operator: 'is',
									value: 'published',
								},
							],
							fields: ['title', 'department'],
						},
					},
				],
				screen: {
					component: 'JobsAdminScreen',
					route: '/admin/jobs',
					menu: {
						slug: 'jobs-admin',
						title: 'Jobs',
						capability: 'manage_jobs',
						position: 25,
					},
				},
				actions: [
					{
						id: 'jobs.edit',
						action: 'Job.Edit',
						supportsBulk: false,
					},
				],
			},
		},
	},
});
```

2. **Create the controller** (the CLI will scaffold this for you):

```ts
import { createResourceDataViewController } from '@wpkernel/ui/dataviews';
import { job } from '@/resources/job';

export const jobDataView = createResourceDataViewController({
	resource: job,
	config: job.ui?.admin?.dataviews!,
});
```

3. **Render the screen** with `ResourceDataView` and optionally a `createDataFormController` for inline creation flows:

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
	);
}
```

### Async boundaries & notices

`ResourceDataView` wraps WordPress DataViews with shared async boundaries so every screen inherits the same UX without bespoke components. The component inspects the list status from `useListResult()` and the optional `screen.menu.capability` requirement to decide whether to render:

- **Loading** - Displayed while the first page is pending or a capability check is still resolving.
- **Empty** - Uses the `emptyState` prop when the list resolves with zero items (falls back to a translated default message when the prop is omitted).
- **Error** - Presents a warning notice when either the resource hook or a standalone `fetchList` rejects; failures are logged through the controller reporter.
- **Permission denied** - Shows a capability warning whenever `config.screen.menu.capability` evaluates to `false` or throws.

Action handlers created by `useDataViewActions()` emit notices via `core/notices` whenever an action succeeds or fails, alongside the existing cache invalidation and reporter logging. Provide a WordPress data registry in the runtime (`configureWPKernel({ registry: window.wp.data })`) so the helpers can dispatch the notices.

`ResourceDataView` emits `data-wpk-dataview-*` attributes so Playwright helpers can target search, filters, bulk actions, and counters reliably.

### Interactivity bridge

`@wpkernel/ui/dataviews` exposes `createDataViewInteraction()` so DataViews can drive
`@wordpress/interactivity` stores without custom glue code.

When `ui.admin.dataviews` is defined:

- `attachUIBindings()` can auto-register controllers and expose them to the bridge.
- CLI-generated interactivity fixtures (`.generated/ui/fixtures/interactivity/*.ts`) wrap
  `createDataViewInteraction()` with:
    - the kernel UI runtime,
    - the resource definition,
    - the DataView actions from your config, and
    - a stable `data-wp-interactive` namespace.

Import these helpers from your plugin or tests to hydrate interactions consistently with
the server configuration.

### Metadata reference

`resource.ui.admin.dataviews` accepts the fields surfaced in the example above:

- `fields` - Column descriptors forwarded to `@wordpress/dataviews`.
- `defaultView` - The server-declared view used when no preference is stored.
- `mapQuery` - Required mapper translating DataViews state into the resource query shape.
- `defaultLayouts` - Optional per-layout overrides (table/grid/list) merged with stored views.
- `views` - Saved views exposed to the UI before preferences are hydrated. Each entry includes an `id`, `label`, and `view` payload, with optional `description`/`isDefault` hints.
- `screen` - Optional metadata for generated screens. When `menu` is present the CLI emits PHP shims under `.generated/php/Admin/**` so WordPress can register the admin menu automatically.
- `actions`, `search`, `searchLabel`, `perPageSizes`, and `getItemId` continue to behave as they did prior to the schema expansion.

### Observability

The DataViews runtime emits lifecycle events for:

- registration,
- view changes,
- action triggers,
- fetch errors, and
- permission denials.

Typed helpers wrap the underlying `runtime.events.*` channels so you can subscribe from
JavaScript directly. An optional `@wordpress/hooks` bridge is available for projects that
prefer WordPress’ hooks API for logging, telemetry, or feature flags.

## CLI & Showcase integration

Running `wpk generate admin-page job` consumes the metadata above and emits:

- `.generated/ui/app/job/admin/JobsAdminScreen.tsx` using `ResourceDataView`.
- `.generated/php/Admin/Menu_JobsAdminScreen.php` when menu metadata is provided.
- `.generated/ui/fixtures/dataviews/job.ts` for tests and documentation.

The showcase application (`examples/showcase`) mounts the generated screen to demonstrate best practices end-to-end.

## Testing & E2E helpers

Unit tests live alongside the controllers and components (`packages/ui/src/dataviews/__tests__`). For unit/integration coverage inside this package, import the runtime harness from `@wpkernel/test-utils/ui` (pass `WPKernelUIProvider` from this package), keep using `tests/dom-observer.test-support.ts` for DOM mocks, and lean on `src/dataviews/test-support/ResourceDataView.test-support.tsx`. The DataView harness exports the full surface (`createKernelRuntime`, `createResource`, `createConfig`, `renderResourceDataView`, `renderActionScenario`, `buildListResource`, `buildActionConfig`, `createDataViewsTestController`, and `flushDataViews`) so suites share runtime setup, rerender control, pagination/view updates, and assertion accessors instead of recreating bespoke wiring. When the harness needs new behaviour, extend it with targeted helpers and accompanying self-tests before updating individual specs. For end-to-end coverage, `@wpkernel/e2e-utils` exposes `kernel.dataview()` helpers that build on the DOM attributes emitted by `ResourceDataView`.

```ts
const dataview = kernel.dataview({ resource: 'job' });
await dataview.waitForLoaded();
await dataview.search('engineer');
await dataview.selectRow('Engineering Manager');
await dataview.runBulkAction('Publish');
```

See the [DataViews guide](../../docs/guide/dataviews.md) for a full walkthrough covering configuration, CLI scaffolding, runtime integration, migration strategy, and accessibility follow-ups.

## Additional resources

- [DataViews Integration - Specification](./DataViews%20Integration%20-%20Specification.md)
- [Phased delivery plan](./PHASES.dataviews.md)
- [E2E helpers](../e2e-utils/README.md)
- [Project documentation](../../docs/index.md)
