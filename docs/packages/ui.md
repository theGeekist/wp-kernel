# @wpkernel/ui

WordPress-native UI primitives that wrap the kernel runtime. The package keeps parity with core components like `@wordpress/dataviews` while supplying controllers, policies, and persistence so admin experiences stay declarative.

## What ships in this package

- **Runtime wiring** – `attachUIBindings()` initialises the UI runtime, reporters, and DataViews controllers when `configureKernel()` boots.
- **DataViews controllers** – `createResourceDataViewController()` and `ResourceDataView` connect kernel resources to the upstream DataViews component with policy-aware actions and persisted preferences.
- **Inline forms** – `createDataFormController()` powers inline creation/editing alongside DataViews tables using kernel actions.
- **Action helpers** – `ActionButton`, `useAction`, and related hooks keep write paths aligned with kernel orchestration.
- **E2E selectors** – Components emit `data-wpk-*` attributes that power `@wpkernel/e2e-utils` helpers.

> 📚 For architectural context see the [DataViews Integration – Specification](https://github.com/theGeekist/wp-kernel/blob/main/packages/ui/DataViews%20Integration%20-%20Specification.md) and the dedicated [DataViews guide](../guide/dataviews.md).

## Runtime integration

1. **Configure the kernel** and opt in to DataViews support:

```ts
import { configureKernel } from '@wpkernel/core';
import { attachUIBindings } from '@wpkernel/ui';

export const kernel = configureKernel({
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
```

2. **Publish the runtime** to React via `KernelUIProvider`:

```tsx
import { KernelUIProvider } from '@wpkernel/ui';
import { kernel } from './core';

const runtime = kernel.getUIRuntime();

export function AdminApp() {
	return (
		<KernelUIProvider runtime={runtime}>
			<JobsAdminScreen />
		</KernelUIProvider>
	);
}
```

## Declaring DataViews metadata

Resources can advertise their preferred admin view so the runtime and CLI can scaffold screens automatically.

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
				defaultView: {
					type: 'table',
					fields: [
						'title',
						'status',
						'department',
						'location',
						'created_at',
					],
					sort: { field: 'created_at', direction: 'desc' },
					perPage: 20,
				},
				mapQuery: ({ search, filters, sort, page, perPage }) => ({
					q: search,
					department: filters.department,
					location: filters.location,
					orderBy: sort?.field ?? 'created_at',
					order: sort?.direction ?? 'desc',
					page,
					perPage,
				}),
				actions: [
					{ id: 'jobs.edit', action: 'Job.Edit' },
					{
						id: 'jobs.close',
						action: 'Job.Close',
						supportsBulk: true,
					},
				],
				screen: {
					component: 'JobsAdminScreen',
					route: '/admin.php?page=wpk-jobs',
					menu: {
						slug: 'wpk-jobs',
						title: 'Jobs',
						parent: 'wpk-root',
						capability: 'manage_options',
					},
				},
			},
		},
	},
});
```

The runtime copies `config.ui` onto the resource object, so `job.ui?.admin?.dataviews` is available wherever you consume the resource.

## Controllers and components

```ts
import {
        createResourceDataViewController,
        createDataFormController,
        ResourceDataView,
} from '@wpkernel/ui/dataviews';
import { job } from '@/resources/job';
import { createJob } from '@/actions/Job.Create';

const controller = createResourceDataViewController({
        resource: job,
        config: job.ui?.admin?.dataviews!,
});

const createJobForm = createDataFormController({
        action: createJob,
        onSuccess: ({ invalidate }) => invalidate(controller.keys.list()),
});

export function JobsAdminScreen() {
        return (
                <ResourceDataView
                        controller={controller}
                        dataForm={createJobForm}
                        emptyState={{
                                title: 'No roles yet',
                                description: 'Create a role to publish it on the careers site.',
                                actionLabel: 'Add job',
                        }}
                />
        );
}
```

The component emits structured events:

- `ui:dataviews:registered` / `ui:dataviews:unregistered`
- `ui:dataviews:view-changed`
- `ui:dataviews:action-triggered`

Consumers can subscribe via the kernel event bus or `wp.hooks` bridge for extensibility.

## CLI output

`wpk generate admin-page job` reads `job.ui.admin.dataviews` and emits:

- React screen that imports `ResourceDataView` and the generated controller.
- Optional PHP menu stub (`Menu_JobsAdminScreen.php`) aligned with the component name.
- Fixture under `.generated/ui/fixtures/dataviews/job.ts` that serialises the declarative config (functions are emitted verbatim).

See [packages/cli](./cli.md) for the generator walkthrough.

## Showcase application

The Jobs admin screen in `examples/showcase/src/admin/pages/JobsList.tsx` is the canonical example. It pairs `ResourceDataView` with a `createDataFormController`-powered creation panel, emits `data-wpk-dataview-*` selectors, and demonstrates action gating via policies.

## Testing & E2E

Unit tests live in `packages/ui/src/dataviews/__tests__/`. They cover:

- Query mapping and controller lifecycle
- Preference persistence (user → role → site precedence)
- Event emission and reporter integration

For end-to-end coverage, install `@wpkernel/e2e-utils` and use the `kernel.dataview()` helpers:

```ts
const dataview = kernel.dataview({ resource: 'job' });
await dataview.waitForLoaded();
await dataview.search('engineer');
await dataview.selectRow('Engineering Manager');
await dataview.runBulkAction('Publish');
```

Helpers rely on the DOM attributes emitted by `ResourceDataView`:

- `data-wpk-dataview="<resource>"`
- `data-wpk-dataview-loading="true|false"`
- `data-wpk-dataview-total`
- `data-wpk-dataview-selection`

## Migration guidance

- **Snapshot reference:** the Gutenberg sources live at `packages/ui/vendor/dataviews-snapshot/` for browsing only. Refresh them with `pnpm --filter @wpkernel/ui update:dataviews-snapshot` when you need updated context.
- **Compat provider:** if you need to target WordPress versions prior to 6.7, wrap `ResourceDataView` behind a feature flag (see `packages/ui/compat/dataviews.ts`) and expose a fallback component.
- **CLI safety:** `serializeForTs()` emits function bodies verbatim, so review generated fixtures for long-term maintainability.

## Accessibility & roadmap follow-ups

Accessibility polishing (keyboard traps, high-contrast sweeps, notice semantics) is scheduled for the dedicated sprint listed in the [project roadmap](../contributing/roadmap.md#-upcoming). Track issues under that milestone before shipping production builds.

## Additional resources

- [DataViews guide](../guide/dataviews.md)
- [E2E helpers package](./e2e-utils.md)
- [Showcase walkthrough](../guide/showcase.md)
- [Core package reference](./core.md)
