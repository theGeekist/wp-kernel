# @wpkernel/ui for Plugin Developers

## Overview

`@wpkernel/ui` wraps WordPress-native interfaces so plugin teams can ship React screens that respect kernel resources, actions, and capability guards. It keeps the runtime aligned with `@wordpress/dataviews` and the kernel action pipeline so DataViews, notices, and async boundaries stay consistent across admin surfaces.

## Workflow

Start by booting the kernel with UI bindings enabled. Generators will scaffold controller modules, but manual projects can call `createResourceDataViewController()` directly. Mount the resulting controller inside `ResourceDataView` so capability checks, pagination, and notices flow through the shared runtime.

## Examples

```tsx
import {
	ResourceDataView,
	createDataFormController,
} from '@wpkernel/ui/dataviews';
import { attachUIBindings } from '@wpkernel/ui/runtime';
import { createKernel } from '@wpkernel/core';
import { job } from '@/resources/job';
import { createJob } from '@/actions/Job.Create';

const kernel = createKernel({
	namespace: 'demo',
	registry: window.wp.data,
	ui: {
		attach: attachUIBindings,
		dataviews: { enable: true, autoRegisterResources: true },
	},
});

const runtime = kernel.getUIRuntime();

export const jobDataView = createResourceDataViewController({
	resource: job,
	config: job.ui?.admin?.dataviews!,
});

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

## Patterns

Treat `wpk.config.ts` as the contract for every admin screen. The configuration you declare under `resource.ui.admin.dataviews` becomes the controller input, so keep filters, saved views, and screen metadata in sync with the resource definition. Controllers produced in `.generated/ui/registry/dataviews/` remain thin adapters around `createResourceDataViewController()` and should forward their config without local overrides.

## Extension Points

`attachUIBindings()` auto-registers every resource that exposes DataView metadata, wiring saved views, menu entries, and action descriptors into the runtime. When a plugin needs custom behaviour - such as additional notices or bespoke menu groups - extend the metadata helpers under `src/runtime/dataviews/metadata/**` rather than patching generated controllers so Playwright attributes and capability guards stay intact.

## Testing

Use `createWPKernelUITestHarness()` from `@wpkernel/test-utils/ui` to wrap components with `WPKernelUIProvider`, WordPress registry mocks, and console guards. The harness pairs with `renderResourceDataView()` from the UI test support helpers, letting suites assert empty, loading, and permission boundaries without reimplementing runtime plumbing.

## Cross-links

Read the framework contributor companion guide for architecture details, and pair these steps with the CLI plugin workflow to keep generated controllers up to date. The testing cookbook under `@wpkernel/test-utils` explains how the harness composes with Playwright fixtures for end-to-end validation.
