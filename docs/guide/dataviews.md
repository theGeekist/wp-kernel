# DataViews Integration

Modern admin tables in WP Kernel build on the upstream `@wordpress/dataviews` component. This guide shows how to configure a resource-driven DataView that honours kernel policies, emits events, persists preferences, and plugs into generators, tests, and accessibility follow-ups.

> 📖 Background: read the [DataViews Integration – Specification](https://github.com/theGeekist/wp-kernel/blob/main/packages/ui/DataViews%20Integration%20-%20Specification.md) for architecture decisions and the [UI package reference](../packages/ui.md) for API summaries.

## Prerequisites

- WordPress 6.7+ (DataViews + Script Modules).
- `@geekist/wp-kernel` configured with `configureKernel()`.
- `@geekist/wp-kernel-ui` attached via `attachUIBindings()`.
- Resources that describe their REST contract and optional policies/actions.

## 1. Describe the admin view in your resource

Add a `ui.admin.dataviews` block to your resource definition. This metadata drives both runtime auto-registration and CLI generators.

```ts
import { defineResource } from '@geekist/wp-kernel/resource';
import type { Job, JobQuery } from '@/contracts/job';

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
						id: 'jobs.publish',
						action: 'Job.Publish',
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

> ℹ️ Runtime imports still come from the published `@wordpress/dataviews` package. The snapshot under `packages/ui/vendor/` exists purely for developer reference.

## 2. Bootstrap the UI runtime

Opt in to DataViews when calling `configureKernel()` and share the runtime with React.

```ts
import { configureKernel } from '@geekist/wp-kernel';
import { attachUIBindings, KernelUIProvider } from '@geekist/wp-kernel-ui';

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

const runtime = kernel.getUIRuntime();
```

```tsx
export function AdminApp() {
	return (
		<KernelUIProvider runtime={runtime}>
			<JobsAdminScreen />
		</KernelUIProvider>
	);
}
```

With `autoRegisterResources: true`, any resource exposing `ui.admin.dataviews` receives a controller automatically. Manual registration remains available via `createResourceDataViewController()` if you need custom wiring.

## 3. Compose the screen

```tsx
import {
	createResourceDataViewController,
	createDataFormController,
	ResourceDataView,
} from '@geekist/wp-kernel-ui/dataviews';
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

`ResourceDataView` wraps the upstream component, providing:

- Policy-gated bulk and row actions.
- Preference persistence through the adapter chain (user → role → site).
- Event emission for `ui:dataviews:*` hooks.
- `data-wpk-dataview-*` attributes for automated tests.

## 4. Listen for events or extend behaviour

```ts
const unsubscribe = kernel.events.on(
	'ui:dataviews:action-triggered',
	(payload) => {
		if (payload.resource === 'job' && !payload.permitted) {
			kernel
				.getUIRuntime()
				.reporter.warn('jobs', 'Denied action', payload.reason);
		}
	}
);

// or via wp.hooks
wp.hooks.addAction(
	'ui:dataviews:view-changed',
	'my-plugin',
	({ resource, viewState }) => {
		if (resource === 'job') {
			window.sessionStorage.setItem(
				'jobs:lastSearch',
				viewState.search ?? ''
			);
		}
	}
);
```

## 5. Generate scaffolding (optional)

Use the CLI to emit screens, fixtures, and optional menus that align with the metadata above.

```bash
wpk generate admin-page job
```

Outputs include:

- React screen under `.generated/ui/app/job/admin/JobsAdminScreen.tsx`.
- Controller + config imports wired to `ResourceDataView`.
- Fixture for Storybook/tests under `.generated/ui/fixtures/dataviews/job.ts`.
- Menu stub when `screen.menu` metadata is present.

## Testing the experience

Unit tests: see `packages/ui/src/dataviews/__tests__/` for patterns covering query mapping, preference persistence, and policy gating.

Playwright helpers: `@geekist/wp-kernel-e2e-utils` exposes a `kernel.dataview()` factory.

```ts
test('filter jobs by department', async ({ page, kernel }) => {
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');
	const dataview = kernel.dataview({ resource: 'job' });
	await dataview.waitForLoaded();
	await dataview.filterBy('Department', 'Engineering');
	await dataview.expectRow('Engineering Manager');
});
```

Helpers rely on the DOM attributes emitted by `ResourceDataView`. Keep those selectors stable when customising the layout.

## Migration guidance

- **Snapshot reference** – `packages/ui/vendor/dataviews-snapshot/` contains a checked-in copy of the Gutenberg sources for offline inspection. Refresh it with `pnpm --filter @geekist/wp-kernel-ui update:dataviews-snapshot -- --source <path>`.
- **Compat provider** – For WordPress versions prior to 6.7 wrap your screens with the compatibility helpers in `packages/ui/src/compat/dataviews.ts` to fall back to legacy tables.
- **Generated code** – CLI fixtures emit function bodies verbatim. Review generated files before committing to keep long-term maintenance manageable.

## Accessibility follow-ups

Accessibility hardening (ARIA reconciliation, focus choreography, high-contrast sweeps) is scheduled for the dedicated sprint tracked in the [project roadmap](../contributing/roadmap.md#-upcoming). File issues against that milestone so the backlog stays visible.

## Further reading

- [UI package reference](../packages/ui.md)
- [CLI package reference](../packages/cli.md)
- [Showcase walkthrough](./showcase.md)
- [E2E helpers](../packages/e2e-utils.md)
