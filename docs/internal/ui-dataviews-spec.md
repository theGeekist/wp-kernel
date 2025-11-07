# DataViews Integration - Specification

**Version:** 0.1  
**Status:** Proposed  
**Date:** 2025-03-17  
**Sprint:** Sprint 6 - DataViews & Admin UX

**Phased delivery:** See [`packages/ui/PHASES.dataviews.md`](packages/ui/PHASES.dataviews.md) for the implementation breakdown.  
**Core docs:** Snapshot of WordPress developer guide lives at [`packages/ui/wp-dataviews.md`](packages/ui/wp-dataviews.md).  
**Version capability:** UI package declares `peerDependencies` of the form `"@wordpress/dataviews": "^N.M.0"` matching the supported WordPress minor. CI verifies against WordPress stable−1, stable, and Gutenberg nightly; the runtime logs a reporter warning when `@wordpress/dataviews` falls outside the pinned range. Example stanza:

```json
{
	"peerDependencies": {
		"@wordpress/dataviews": "^9.1.0
	}
}
```

---

## 1. Purpose

Elevate `@wordpress/dataviews` to a first-class surface within WP Kernel so modern admin tables, grids, and pickers inherit wpk capabilities (resources, actions, capabilities, events) with zero bespoke glue. The integration must stay aligned with WordPress core implementations, plug into `configureWPKernel()` via the existing `ui` configuration, and remain consumable without the wpk bundle.

---

## 2. Goals & Non-Goals

- Adopt `@wordpress/dataviews` as the default admin view surface for wpk resources while tracking core updates without forks or hard forks.
- Provide an opt-in path during `configureWPKernel({ ui })` that wires DataViews to the wpk runtime (registry, reporter, capabilities, cache) for end-to-end support.
- Allow standalone usage: consumers can render the same components with their own data/adapters when the wpk runtime is unavailable.
- Let wpk configuration (`wpk.config.ts` / CLI) declare DataViews metadata so resources can advertise default admin views.
- Enforce existing invariants: UI never calls transport directly, writes flow through actions, errors are typed `WPKernelError` subclasses, and canonical events are used.

Non-goals:

- Replacing or modifying core DataViews layouts; we consume upstream components as-is.
- Introducing bespoke table implementations for legacy WordPress versions (fallback remains out of scope here).
- Persisting DataViews view state to every possible backing store; we will provide sensible defaults and extension hooks only.

---

## 3. Current State

- Resources expose hooks (`useList`, `useGet`) once `attachUIBindings` runs, but there is no higher-level controller or component for DataViews.
- `configureWPKernel({ ui })` only attaches resource hooks; it lacks awareness of UI components or registry-backed view metadata.
- CLI wpk config has no way to describe UI defaults, leaving admin screens bespoke.
- Tests and documentation describe DataViews usage manually, duplicating data plumbing and risking divergence from wpk conventions.

---

## 4. Proposed Architecture

### 4.1 Kernel UI Runtime Extensions

- Extend `WPKernelUIRuntime` with a `dataviews` namespace:
    - `registry`: keyed by resource name, storing DataViews definitions resolved at runtime.
    - `controllers`: factory functions that translate DataViews state into wpk resource queries.
    - `preferences`: adapter interface for persisting user view settings (default uses `@wordpress/preferences`; consumers can override).
- Augment `attachUIBindings()` to initialise the DataViews runtime when `options?.dataviews?.enable !== false`.
- Emit canonical events on the wpk event bus:
    - `ui:dataviews:registered` / `ui:dataviews:unregistered`
    - `ui:dataviews:view-changed`
    - `ui:dataviews:action-triggered`
      Each payload is typed and uses `WPKernelError` subclasses for failure cases (e.g., `DataViewsControllerError`).

```ts
// packages/ui/src/runtime/dataviews-events.ts
export type DataViewRegisteredPayload = {
	resource: string;
	preferencesKey: string;
};

export type DataViewChangedPayload = {
	resource: string;
	viewState: {
		fields: string[];
		sort?: { field: string; direction: 'asc' | 'desc' };
		search?: string;
		filters?: Record<string, unknown>;
		page: number;
		perPage: number;
	};
};

export type DataViewActionTriggeredPayload = {
	resource: string;
	actionId: string;
	selection: Array<string | number>;
	meta?: Record<string, unknown>;
	permitted: boolean;
	reason?: string;
};
```

### 4.2 Resource Metadata & CLI Config

- Extend `ResourceConfig` with an optional `ui` block:
    ```ts
    type ResourceUIConfig = {
    	admin?: {
    		view?: 'dataviews';
    		dataviews?: {
    			fields: DataViewFieldConfig[];
    			defaultView: DataViewViewState;
    			actions?: DataViewActionConfig[];
    			preferencesKey?: string;
    			screen?: {
    				component?: string;
    				route?: string;
    				resourceImport?: string;
    				resourceSymbol?: string;
    				wpkernelImport?: string;
    				wpkernelSymbol?: string;
    				menu?: {
    					slug: string;
    					title: string;
    					capability?: string;
    					parent?: string;
    					position?: number;
    				};
    			};
    		};
    	};
    };
    ```
- Update CLI schema validation to accept the new `ui` block, ensuring TypeScript types stay in sync.
- `loadWPKernelConfig()` normalises the metadata and surfaces it on `ResourceObject.ui`.
- CLI generators (`wpk generate admin-page`) consume the metadata to scaffold React entries that import the new DataViews primitives instead of ad-hoc tables.
- Generator contract for `wpk generate admin-page`:
    - **Inputs:** resource with `ui.admin.dataviews` metadata, optional `--route` and `--screen` flags.
    - **Outputs:**
        - `.generated/ui/app/<resource>/admin/<Screen>.tsx` rendering `<ResourceDataView resource={resource} config={resource.ui?.admin?.dataviews} runtime={useWPKernelUI()} />` with imports derived from `screen.resourceImport`/`screen.wpkernelImport` metadata.
        - Optional menu registration (when `screen.menu` is provided) emitted to `.generated/php/Admin/Menu_<Screen>.php`.
        - Fixture under `.generated/ui/fixtures/dataviews/<resource>.ts` serialising the declarative metadata for Storybook/tests.
- Validation note: reiterate route ↔ identity alignment-if `identity.param` is declared the corresponding route MUST include `:${param}`; generator errors should reuse existing `WPKernelError('ValidationError')` messaging.

### 4.3 Query & Data Orchestration

- Introduce a `createResourceDataViewController(resource, config)` helper in `@wpkernel/ui/dataviews`.
    - Maps DataViews state (`search`, `filters`, `sort`, `pagination`) to the resource's query shape.
    - Relies on `resource.useList` for reactive data and `resource.prefetchList` for optimistic UI paths.
    - Handles cache invalidation and refresh via `kernel.invalidate` after bulk actions or mutations complete.
- Provide a React component `ResourceDataView`:
    ```tsx
    <ResourceDataView
    	resource={job}
    	config={job.ui?.admin?.dataviews}
    	runtime={runtime} // defaults to useWPKernelUI()
    />
    ```
    Internally it composes `DataViews` with the controller output while preserving escape hatches (custom renderers, manual data injection).

DataViews state → query mapping contract:

| DataViews state                                      | Resource query mapping example                                |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `view.search`                                        | `{ q: view.search }`                                          |
| `view.filters`                                       | `{ [filter.field]: filter.value }` per configured operator    |
| `view.sort.field` / `view.sort.direction`            | `{ sortBy: field, sortDir: direction }`                       |
| `view.page` / `view.perPage`                         | `{ page: view.page, perPage: view.perPage }`                  |
| `view.page`, `view.perPage` with cursor-based config | `{ cursor: buildCursor(view.page, view.perPage) }` when opted |

```ts
export type QueryMapping<TQuery> = (
	state: DataViewChangedPayload['viewState']
) => TQuery;
```

### 4.4 Actions, Capabilities, and Editing

- Bulk actions configuration references wpk actions by identifier:
    ```ts
    type DataViewActionConfig = {
    	action: DefinedActionSignature;
    	label: string;
    	supportsBulk?: boolean;
    	capability?: string; // checked via capability runtime before rendering
    };
    ```
- Provide hooks for `DataViews.DataForm` integration:
    - `createDataFormController({ resource, action })` ensures mutations dispatch the configured action and trigger cache invalidation.
    - Errors are wrapped in `WPKernelError` subclasses for consistent notice handling.
- Capability precedence:
    - Render: `runtime.capabilities.capability?.can(capability)` must resolve `true` for an action to render. When `supportsBulk` and the capability fails, default behaviour is to hide the action unless `disabledWhenDenied: true` is set, in which case the action renders in a disabled state.
    - Invoke: regardless of render state, controllers re-check `can()` on execution. Failure emits `ui:dataviews:action-triggered` with `permitted=false` and displays a warning notice summarising `reason`.

Error normalization matrix:

| Condition                               | Kernel error class         | UI notice level |
| --------------------------------------- | -------------------------- | --------------- |
| REST validation / 4xx domain failure    | `DataViewsActionError`     | `danger`        |
| Permission denied (capability/403)      | `DataViewsActionError`     | `warning`       |
| Transport/network error (500+/fetch)    | `TransportError` (wrapped) | `danger`        |
| Controller/configuration mapping issues | `DataViewsControllerError` | `danger`        |

### 4.5 configureWPKernel Integration

- Extend `ConfigureWPKernelOptions['ui']` to accept:
    ```ts
    type WPKUIConfig = {
    	enable?: boolean;
    	attach?: WPKernelUIAttach;
    	options?: UIIntegrationOptions & {
    		dataviews?: {
    			enable?: boolean;
    			preferences?: DataViewPreferencesAdapter;
    			autoRegisterResources?: boolean; // default true
    		};
    	};
    };
    ```
- When `autoRegisterResources` is true, `attachUIBindings` reads `resource.ui?.admin?.dataviews` and invokes the controller factory upon `resource:defined`.
- Consumers can disable the wpk coupling (`dataviews.enable = false`) while still importing the standalone helpers manually.

### 4.6 Standalone Consumption

- Ship `createDataViewsRuntime(adapter)` that mirrors the kernel-attached runtime shape but accepts explicit adapters:
    - `fetchList(query)`, `prefetchList`, `invalidate` supplied by the host.
    - `reporter`, `preferences`, and optional `capability` stubs.
- `ResourceDataView` accepts a `runtime` prop so non-kernel environments can pass the standalone runtime while reusing identical components.
- Document standalone setup in `docs/packages/ui.md` with emphasis on action dispatch substitution and cache responsibilities.

### 4.7 View Persistence & User Preferences

- Default persistence uses the WordPress `core/preferences` store scoped by namespace (`${kernel.getNamespace()}/dataviews/${resource.name}`) and stores data per user.
- `DataViewPreferencesAdapter` supports optional role- and site-level persistence. Adapters resolve values using precedence **user → role → site**, returning the first available scope.
- Kernel mode ships with a user-scoped adapter layered over `core/preferences`; role/site adapters can hook into external stores (e.g., options API) without breaking the contract.
- Standalone adapters can persist to localStorage or custom stores while respecting the scope precedence.

```ts
export type DataViewPreferencesAdapter = {
	get(key: string): Promise<unknown | undefined>;
	set(key: string, value: unknown): Promise<void>;
	getScopeOrder?: () => Array<'user' | 'role' | 'site'>;
};

export function defaultPreferencesKey(
	namespace: string,
	resource: string
): string {
	return `${namespace}/dataviews/${resource}`;
}
```

### 4.8 Instrumentation & Telemetry

- Reporter child namespace: `namespace.ui.dataviews.${resource}` for consistency.
- Events emitted on the wpk bus also bridge to `wp.hooks` through the existing `wpkEventsPlugin`, enabling extensions to listen for DataViews lifecycle without touching internals.
- Controllers log structured debug information (e.g., query transforms, capability gating decisions) via the reporter.

---

## 5. API Surface Summary

- `ResourceConfig['ui']` (runtime + CLI schema updates).
- `ResourceObject.ui?.admin?.dataviews` metadata emitted by `defineResource`.
- New exports from `@wpkernel/ui/dataviews`:
    - `ResourceDataView`, `createResourceDataViewController`, `createDataFormController`
    - `DataViewPreferencesAdapter`, `createDataViewsRuntime`
    - Type helpers (`DataViewFieldConfig`, `DataViewViewState`, `DataViewActionConfig`)
- `ConfigureWPKernelOptions.ui.options.dataviews` for automatic runtime attachment.
- Kernel events: `ui:dataviews:*`.
- `WPKernelError` subclasses: `DataViewsConfigurationError`, `DataViewsControllerError`, `DataViewsActionError`.

---

## 5.1 Usage & Integration Examples

### Configure Kernel With DataViews Runtime

```ts
// app/bootstrap/kernel.ts
import { configureWPKernel } from '@wpkernel/core';
import { attachUIBindings } from '@wpkernel/ui';

export const wpk = configureWPKernel({
	namespace: 'my-plugin',
	ui: {
		attach: attachUIBindings,
		options: {
			dataviews: {
				enable: true,
				preferences: {
					// optional custom adapter override
					getScopeOrder: () => ['user', 'role', 'site'],
				},
			},
		},
	},
});
```

### Kernel Config Declaring DataViews Defaults

```ts
// wpk.config.ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

export default {
	version: 1,
	namespace: 'my-plugin',
	schemas: {},
	resources: {
		job: {
			name: 'job',
			routes: {
				list: { path: '/my-plugin/v1/jobs', method: 'GET' },
				get: { path: '/my-plugin/v1/jobs/:id', method: 'GET' },
			},
			ui: {
				admin: {
					view: 'dataviews',
					dataviews: {
						fields: [
							{
								id: 'title',
								label: 'Title',
								enableSorting: true,
							},
							{ id: 'status', label: 'Status' },
							{ id: 'department', label: 'Department' },
						],
						defaultView: {
							type: 'table',
							fields: ['title', 'status', 'department'],
							sort: { field: 'title', direction: 'asc' },
							perPage: 20,
						},
						actions: [
							{
								action: 'job.delete',
								label: 'Delete',
								supportsBulk: true,
								capability: 'deleteJob',
							},
						],
					},
				},
			},
		},
	},
} satisfies WPKernelConfigV1;
```

### Rendering a Resource DataView in React

```tsx
// app/screens/jobs/AdminJobs.tsx
import { WPKernelUIProvider, useWPKernelUI } from '@wpkernel/ui';
import { ResourceDataView } from '@wpkernel/ui/dataviews';
import { job } from '@/resources/job';
import { wpk } from '@/bootstrap/kernel';

function JobsAdminContent() {
	const runtime = useWPKernelUI();

	return (
		<ResourceDataView
			resource={job}
			config={job.ui?.admin?.dataviews}
			runtime={runtime}
		/>
	);
}

export function JobsAdminScreen() {
	const runtime = kernel.getUIRuntime();
	if (!runtime) {
		throw new Error('UI runtime not attached.');
	}

	return (
		<WPKernelUIProvider runtime={runtime}>
			<JobsAdminContent />
		</WPKernelUIProvider>
	);
}
```

### Standalone Usage With Custom Adapter

```tsx
// playground/dataviews-standalone.tsx
import {
	createDataViewsRuntime,
	createResourceDataViewController,
	ResourceDataView,
} from '@wpkernel/ui/dataviews';
import { createReporter } from '@wpkernel/core';
import { useMemo } from 'react';

const fetchList = async (viewState) => {
	// Replace with real data source
	return { items: [], total: 0 };
};

const runtime = createDataViewsRuntime({
	namespace: 'playground',
	reporter: createReporter({
		namespace: 'playground.ui',
		channel: 'all',
		level: 'info',
	}),
	preferences: {
		async get(key) {
			return window.localStorage.getItem(key);
		},
		async set(key, value) {
			window.localStorage.setItem(key, value);
		},
	},
	fetchList,
});

export function StandaloneDataView() {
	const config = useMemo(
		() => ({
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: { type: 'table', fields: ['title'] },
		}),
		[]
	);

	const controller = useMemo(
		() =>
			createResourceDataViewController({
				resourceName: 'playground',
				config,
				runtime,
				fetchList,
			}),
		[runtime, config, fetchList]
	);

	return <ResourceDataView controller={controller} runtime={runtime} />;
}
```

---

## 6. Implementation Plan

1. **Runtime groundwork**
    - Extend `WPKernelUIRuntime` types, update `attachUIBindings`, and wire event emissions.
    - Implement `DataViewPreferencesAdapter` default (core/preferences) and plumbing.
    - Provide `packages/ui/scripts/update-dataviews-snapshot.ts` that syncs the vendor snapshot, runs `pnpm --filter @wpkernel/ui typecheck`, and logs `SUCCESS: snapshot synchronized to <git sha>`; abort when the synced version falls outside the declared peer range.
2. **Controllers and components**
    - Implement `createResourceDataViewController`, `ResourceDataView`, and bulk-action bridge.
    - Implement `createDataFormController` for DataForm integration.
    - Add standalone runtime factory (`createDataViewsRuntime`).
3. **Resource metadata & CLI**
    - Update wpk and CLI TypeScript types, validators, and loader to surface `resource.ui`.
    - Adjust generators/docs to consume the new metadata and emit DataViews scaffolding.
    - Document lightweight migration path (`wpk generate admin-page`) and provide a compat data provider for incremental adoption; defer automated migrations to a future RFC.
4. **Documentation & samples**
    - Update `docs/packages/ui.md`, add dedicated guide for DataViews.
    - Provide example resource + admin screen in `examples/showcase`.
5. **Testing**
    - Unit tests for controller transformation logic (filters, sorting, pagination mapping).
    - Integration tests exercising configureWPKernel auto-registration.
    - Playwright scenario covering a generated admin screen (list, filter, bulk action, DataForm edit).

---

## 7. Testing & QA Strategy

- **Unit**: jest tests in `packages/ui` for controller state transitions, preferences persistence, and error handling (`WPKernelError` expectations).
- **Integration**: configure wpk in tests to ensure events fire, controllers register, and `kernel.attachUIBindings` respects options toggles.
- **E2E**: Playwright suite using the showcase app to validate listing, sorting, filtering, bulk actions, and DataForm submissions.
- **Type & lint**: ensure new types pass `pnpm typecheck` for both runtime and tests; add contract tests for CLI schema validation.
- **Storybook/manual**: add a Storybook story referencing the standalone runtime to verify kernel-free consumption.

---

## 8. Risks & Mitigations

- **Core drift**: DataViews API changes upstream could break our wrappers. Mitigation: rely on upstream types via direct imports and add compatibility guards; surface version checks in reporter logs.
- **Bundle size**: pulling the full DataViews package into the UI bundle may increase size. Mitigation: expose entry-points that tree-shake when DataViews is unused; document opt-out via `dataviews.enable = false`.
- **Capability lag**: capabilities loaded after UI attachment may cause gating issues. Mitigation: controllers resolve capability runtime lazily (using getters) matching existing UI runtime behaviour.
- **Preference storage availability**: WordPress environments without `core/preferences` could throw. Mitigation: fall back to in-memory adapter and warn via reporter.
- **Version drift**: DataViews peer dependency may move faster than wpk releases. Mitigation: pin peer range to the WordPress minor we target, exercise CI against WP stable−1, stable, and Gutenberg nightly, and surface reporter warnings when detected versions fall outside that matrix (warning tooling tracked separately).

---

## 9. Deferred Items & Follow-Ups

- **Migration tooling**: beyond `wpk generate admin-page` and compat data provider, heavier migrations stay out of MVP scope and should be revisited post-adoption.
- **Version warnings**: automated detection/reporting of unsupported DataViews versions is deferred to a separate tooling effort.
- **Accessibility sprint**: dedicated accessibility hardening (ARIA audits, keyboard flows, announcements) is scheduled in the roadmap accessibility sprint; capture DataViews-specific tasks there.

---

## 10. Delivery Checklist

Before closing the MVP, ensure all items below are satisfied:

- [ ] Event payload types exported (`DataViewRegisteredPayload`, `DataViewChangedPayload`, `DataViewActionTriggeredPayload`).
- [ ] Query mapping function (`QueryMapping<TQuery>`) implemented and covered by tests.
- [ ] Preferences adapter interface + `defaultPreferencesKey` shipped and referenced.
- [ ] `@wordpress/dataviews` peer range and CI matrix documented and enforced with runtime warning.
- [ ] `wpk generate admin-page` contract implemented (React screen, optional PHP menu, fixture).
- [ ] Capability precedence rules enforced (render + invoke semantics) with notice emission.
- [ ] Error normalization table reflected in controller implementations/tests.
- [ ] Snapshot update script emits success signal and validates peer range compatibility.
- [ ] Showcase admin screen renders `ResourceDataView` end-to-end with wpk boot.
