# configureKernel() – Unified Bootstrap API Specification

**Version:** 1.0  
**Status:** Proposed (draft, not yet implemented)  
**Date:** 2025-10-08  
**Sprint:** Post-MVP (v1.1.0)

---

## 1. Purpose

`configureKernel()` is the single entry point for WP Kernel framework configuration. It establishes global framework state and returns a configured instance that provides access to all framework APIs.

### Problem Statement

Current configuration is fragmented across `withKernel`, namespace helpers, reporter factories, and UI side-effect imports. This duplication leads to inconsistent namespaces, multiple reporter instances, accidental misconfiguration, and hidden coupling between packages.

### Core Principle

Configure once, everything inherits. A single `configureKernel()` call replaces the current dual bootstrap (`withKernel` plus ad-hoc namespace configuration) and ensures every framework surface shares the same runtime context.

---

## 2. Configuration Surfaces Consolidated by configureKernel

Based on `CURRENT_STATE.md`, the kernel exposes several independent configuration surfaces. `configureKernel()` becomes the authoritative source for each surface.

### 2.1 Namespace

- Eliminates duplicate namespace configuration across resources, actions, policies, and jobs.
- Ensures cache keys, store names, and event payloads share a consistent namespace.
- Leverages `@wpkernel/core/contracts` utilities (`detectNamespace`,
  `sanitizeNamespace`, `WPK_NAMESPACE`, etc.) to provide sensible defaults and
  explicit overrides when a namespace is not supplied.

### 2.2 Reporter

- Chooses the reporter instance used by the action runtime, resource stores, and UI integrations.
- Supports child reporters for scoped logging while preserving shared transports and levels.

### 2.3 Registry Integration

- Installs kernel middleware/plugins into a WordPress Data registry.
- Controls the error-to-notices bridge and `wp.hooks` event emission strategy.

### 2.4 Redux Middleware

- Determines whether Redux envelopes wrap action dispatch.
- Allows consumers to append custom middleware after the kernel middleware stack.

### 2.5 Policy Runtime

- Configures the capability cache and proxy.
- Aligns action authorization checks with `usePolicy()` UI hook behavior.

### 2.6 Global Runtime

- Seeds `global.__WP_KERNEL_ACTION_RUNTIME__` with reporter, policy, jobs, and bridge implementations.
- Sets helper shims such as `globalThis.getWPData()`.

### 2.7 UI Integration Runtime

- Establishes a `KernelUIRuntime` that coordinates hooks, components, and other UI primitives with the configured kernel instance.
- Eliminates side-effect imports from `@wpkernel/ui` by driving attachment through explicit configuration.
- Ensures adapters (e.g., `attachUIBindings`) subscribe to `kernel.events` for resource/action definitions-no `__WP_KERNEL_UI_*` globals participate in runtime setup.

### 2.8 Event Bus

- Exposes a typed `KernelEventBus` for lifecycle and extensibility events.
- Continues to bridge into `wp.hooks` (via `kernelEventsPlugin`) while offering direct subscription APIs on the kernel instance.

---

## 3. Proposed Solution: configureKernel()

`configureKernel()` is the canonical bootstrap for the entire framework. Everything flows through it and every runtime capability is available through the returned instance.

```typescript
function configureKernel(config: KernelConfig): KernelInstance;
```

### 3.1 Input Configuration

| Property                    | Type                                                          | Required | Description                                                                                  |
| --------------------------- | ------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `namespace`                 | `string`                                                      | Yes      | Plugin/theme namespace used for stores, cache keys, events, and reporters.                   |
| `registry`                  | `KernelRegistry`                                              | No       | WordPress Data registry instance. Defaults to `window.wp.data` when available.               |
| `reporter`                  | `Reporter`                                                    | No       | Existing reporter to reuse. Defaults to `createReporter({ namespace, level: 'debug' })`.     |
| `middleware`                | `ReduxMiddleware[]`                                           | No       | Custom middleware appended after kernel middleware.                                          |
| `enableReduxMiddleware`     | `boolean`                                                     | No       | Enables Redux envelopes for actions (default `true`).                                        |
| `enableRegistryIntegration` | `boolean`                                                     | No       | Enables the error bridge and `wp.hooks` bridge (default `true`).                             |
| `ui`                        | `{ attach?: KernelUIAttach; options?: UIIntegrationOptions }` | No       | Optional adapter function for UI integration (e.g., `attachUIBindings` from `@wpkernel/ui`). |
| `policies`                  | `PolicyMap<Record<string, unknown>>`                          | No       | Initial policy map registration (optional convenience).                                      |
| `autoBootstrap`             | `boolean`                                                     | No       | If `true`, automatically installs registry integration and middleware. Defaults to `true`.   |

`UIIntegrationOptions` mirrors the contract defined in `UI Package Architecture Fix - Specification.md` and controls UI-specific features (e.g., suspense boundaries, notices, devtools). The kernel never imports UI code directly; callers either supply a `KernelUIAttach` adapter during configuration or attach bindings later by invoking `kernel.attachUIBindings()` with the adapter exported from `@wpkernel/ui`.

### 3.2 Output Instance

`configureKernel()` returns an object that exposes the framework APIs with configuration baked in.

````typescript
interface KernelInstance {
  readonly config: Readonly<KernelConfig>;
  teardown: () => void;
  isConfigured: () => boolean;
  getNamespace: () => string;
  getReporter: () => Reporter;
  setReporter: (reporter: Reporter) => void;
  hasUIRuntime: () => boolean;
  getUIRuntime: () => KernelUIRuntime | undefined;
  attachUIBindings: (attach: KernelUIAttach, options?: UIIntegrationOptions) => KernelUIRuntime;
  defineResource: <T, TQuery = unknown>(config: ResourceConfig<T, TQuery>) => ResourceObject<T, TQuery>;
  defineAction: <TArgs = void, TResult = void>(config: ActionConfig<TArgs, TResult>) => DefinedAction<TArgs, TResult>;
  definePolicy: <K extends Record<string, unknown>>(config: PolicyDefinitionConfig<K>) => PolicyHelpers<K>;
  defineJob: <TArgs = void, TResult = void>(config: JobConfig<TArgs, TResult>) => DefinedJob<TArgs, TResult>;
  invalidate: (patterns: CacheKeyPattern | CacheKeyPattern[], options?: InvalidateOptions) => void;
  invalidateAll: () => void;
  createChildReporter: (namespace: string) => Reporter;
  emit: (eventName: string, payload: unknown) => void;
  getRegistry: () => KernelRegistry | undefined;
  readonly events: KernelEventBus;
  _getGlobalState: () => GlobalKernelState;
}

`KernelUIRuntime` is defined in `UI Package Architecture Fix - Specification.md` and represents the shared UI service layer (hooks, components, primitives). The kernel instance exposes helper methods so applications can access or lazily attach this runtime as needed.

```typescript
interface ActionConfig<TArgs, TResult> {
  name: string;
  handler: ActionFn<TArgs, TResult>;
  options?: ActionOptions<TArgs, TResult>;
}

interface PolicyDefinitionConfig<K extends Record<string, unknown>> {
  map: PolicyMap<K>;
  options?: PolicyOptions<K>;
}

interface JobConfig<TArgs, TResult> {
  name: string;
  handler: JobFn<TArgs, TResult>;
  options?: JobOptions<TArgs, TResult>;
}

type KernelUIAttach = (kernel: KernelInstance, options?: UIIntegrationOptions) => KernelUIRuntime;
````

`KernelEventBus` is a typed pub/sub interface exposed on the instance; it powers internal lifecycle emission and external extensibility while continuing to bridge into `wp.hooks` when the events plugin is enabled.

Positional signatures (`defineAction(name, handler, options)`, etc.) remain temporarily available and delegate to these config-based forms while emitting deprecation warnings.

````

---

## 4. Framework APIs Accessed Through the Instance

`configureKernel()` converts previously static exports into instance methods that inherit configuration.

### 4.1 Resources
- `kernel.defineResource()` produces stores that auto-register with the configured registry.
- UI helpers (hooks, controllers) attach only when the `KernelUIRuntime` is active.
- Resource events honor the configured event bridge and reporter.

### 4.2 Actions
- `kernel.defineAction({ name, handler, options })` wraps lifecycle events with the shared reporter and policy runtime.
- Action dispatch routes through configured Redux middleware when enabled.
- `invokeAction()` is exposed indirectly via the defined action’s methods.

### 4.3 Policies
- `kernel.definePolicy({ map, options })` seeds the shared policy cache and proxy.
- `usePolicy()` and related UI helpers become available when the UI runtime is active.

### 4.4 Data Integration
- Custom stores register through the instance, ensuring registry middleware is installed once.
- `kernel.emit()` uses the configured event bridge (hooks, BroadcastChannel, etc.).

### 4.5 Reporter Utilities
- `kernel.getReporter()` returns the shared reporter.
- `kernel.createChildReporter()` nests namespaces (`plugin/module`) while keeping transports consistent.

### 4.6 UI Runtime Access
- `kernel.hasUIRuntime()` reports whether UI integration is active.
- `kernel.getUIRuntime()` returns the runtime established during configuration (or `undefined` if UI disabled).
- `kernel.attachUIBindings(attach, options)` allows advanced consumers to attach or replace UI bindings on demand (useful for lazy-loaded bundles) and returns the active `KernelUIRuntime`.

### 4.7 Utility APIs
- `kernel.invalidate()` scopes cache invalidation by namespace.
- `kernel.invalidateAll()` clears all kernel-managed caches.
- `_getGlobalState()` is reserved for debugging/test harnesses.

### 4.8 Events
- `kernel.events` exposes a typed bus for subscribing to framework lifecycle events (e.g., `resource:defined`, `action:completed`).
- `kernel.emit()` publishes custom events into the bus; when registry integration is enabled the events plugin forwards them to `wp.hooks` for ecosystem consumption.

---

## 5. Behavioral Guarantees

1. **Single Source of Truth:** Namespace configured once, inherited everywhere. No API accepts an overriding namespace.
2. **Consistent Reporter:** One reporter instance powers actions, resources, jobs, and middleware. Reporter overrides happen through `setReporter()` on the instance.
3. **Uniform Registry Integration:** Error-to-notices bridge and `wp.hooks` integration are either fully enabled or fully disabled.
4. **Consistent Redux Middleware:** Action dispatch respects the same middleware configuration regardless of entry point.
5. **Event Visibility:** Lifecycle events flow through a single typed bus and, when enabled, bridge to `wp.hooks`.
6. **Shared Policy Runtime:** Policies defined through the instance are the same ones consumed by the UI and action runtime.
7. **Explicit UI Integration:** Developers opt in by supplying a `KernelUIAttach` adapter (either at configuration time or via `kernel.attachUIBindings()`). Without an adapter, UI helpers throw descriptive errors.
8. **Deterministic Lifecycle:** Configuration → Usage → Teardown is well-defined (see §6).

---

## 6. Configuration Lifecycle

### 6.1 Configuration Phase
- Called during plugin bootstrap.
- Validates namespace and optional registry presence.
- Seeds reporter, policy runtime, registry bridge, middleware, and optional UI runtime.

### 6.2 Usage Phase
- Resources, actions, policies, jobs, and utilities are accessed through the instance.
- All API calls inherit the configuration without additional arguments.
- UI hooks, components, and primitives operate only when the UI runtime is active.

### 6.3 Teardown Phase
- `kernel.teardown()` removes middleware, unregisters event listeners, and resets global state.
- Intended for hot reloading, acceptance tests, or controlled reconfiguration.

---

## 7. Edge Cases and Constraints

- **Multiple Namespaces:** A single instance manages one namespace. Consumers can create additional instances for submodules or prefix names manually.
- **Reconfiguration:** Subsequent calls to `configureKernel()` should warn or throw unless the previous instance was torn down. Development mode may support reconfigure-after-teardown for hot reloads.
- **SSR / No Registry:** `registry` is optional. Without it, registry-dependent features (error bridge, `useAction`, `useGet`, `useList`) are disabled gracefully.
- **Pre-configuration Definitions:** Resources or actions must be defined through the instance. The global `defineResource` export remains for backward compatibility but issues a deprecation warning and delegates when possible.
- **UI Runtime Disabled:** If no `KernelUIAttach` adapter has been provided, UI runtime accessors return `undefined`, resource hook properties remain unset, and attempts to use UI helpers throw `KernelError` guidance to attach bindings.

---

## 8. Success Criteria

1. Single call to `configureKernel()` replaces current multi-step bootstrap.
2. Namespace, reporter, registry, middleware, and policy runtime stay consistent across all APIs.
3. UI integration (hooks, components, primitives) no longer relies on `import '@wpkernel/ui'` side effects and instead flows through the `KernelUIRuntime`.
4. Migration path from `withKernel` and legacy helpers is documented with deprecation warnings.
5. Specification is clear enough to implement without ambiguity.
6. No runtime configuration happens outside the returned instance.

---

## 9. Open Questions

1. **Idempotency:** Should repeated calls throw or silently reuse the existing instance? Draft recommendation: throw in production, allow reconfigure-after-teardown in development.
2. **Scoped Instances:** Do we support multiple instances side by side (e.g., multi-tenant plugins) or enforce a singleton?
3. **SSR Defaults:** What degraded features should ship when no registry exists, and how do we surface warnings?
4. **Teardown Semantics:** Should teardown be mandatory before reconfiguration? How do we protect against partial teardown?
5. **Validation:** What schema validation should run on the configuration object?
6. **UI Integration Default:** Should the kernel attempt to auto-attach UI bindings when an adapter is discoverable, or require callers to provide the adapter explicitly every time?

---

## 10. Relationship to Current APIs

### 10.1 Replaces
- Manual namespace and reporter configuration scattered across resources, actions, and `withKernel`.
- Legacy `withKernel()` as the primary bootstrap path.
- UI side-effect import pattern for hook attachment.

### 10.2 Unifies
- Namespace resolution (`detectNamespace`, `getNamespace`).
- Reporter lifecycle management.
- Registry and middleware bootstrap.
- Policy runtime configuration and cache setup.
- UI integration opt-in.

### 10.3 Retains (Advanced / Internal Use)
- Registry integration now lives entirely behind `configureKernel()`.
- Global hook attachment utilities stay accessible for legacy code but emit warnings.
- `global.__WP_KERNEL_ACTION_RUNTIME__` escape hatch continues to exist for testing overrides.

---

## 11. Resolving the UI Import Problem

**Current workflow (problematic):**

```typescript
import '@wpkernel/ui'; // required side effect
import { configureKernel, defineResource } from '@wpkernel/core';

configureKernel({ registry: wp.data });

const job = defineResource({ name: 'job', routes: { list: '/api/jobs' } });
const { data } = job.useList(); // works only if UI import executed earlier
````

Issues: hidden side-effects, load order dependencies, larger bundles, and easy-to-miss imports.

**New workflow (explicit):**

```typescript
import { configureKernel } from '@wpkernel/core';

import { attachUIBindings } from '@wpkernel/ui';

const kernel = configureKernel({
	namespace: 'showcase',
	registry: wp.data,
	ui: { attach: attachUIBindings },
});

const job = kernel.defineResource({
	name: 'job',
	routes: { list: '/api/jobs' },
});
const { data } = job.useList(); // hooks available because UI runtime was enabled
```

Benefits: explicit opt-in, no load-order coupling, no forced UI bundle, and clear developer ergonomics.

---

## 12. Usage Examples

### 12.1 Basic Plugin Bootstrap

```typescript
// app/index.ts
import { configureKernel } from '@wpkernel/core';

const kernel = configureKernel({
	namespace: 'my-plugin',
	registry: window.wp?.data,
});

// Resources inherit namespace automatically
import { posts } from './resources/posts';
import { CreatePost } from './actions/CreatePost';
```

### 12.2 Custom Reporter in Production

```typescript
// app/kernel.config.ts
import { configureKernel, createReporter } from '@wpkernel/core';

configureKernel({
	namespace: 'acme-store',
	registry: window.wp?.data,
	reporter: createReporter({
		namespace: 'acme-store',
		level: 'warn',
		transports: [consoleTransport, sentryTransport],
	}),
});
```

### 12.3 Enabling UI Integration on Demand

```typescript
import { KernelUIProvider, attachUIBindings } from '@wpkernel/ui';

const kernel = configureKernel({
  namespace: 'analytics',
  registry: window.wp?.data,
  ui: { attach: attachUIBindings, options: { suspense: true } },
});

const runtime = kernel.getUIRuntime();

const reports = kernel.defineResource({
  name: 'reports',
  routes: {
    list: { path: '/wp/v2/reports', method: 'GET' },
    create: { path: '/wp/v2/reports', method: 'POST' },
  },
});

export function ReportsList() {
  const { data, status } = reports.useList();
  // render UI...
}

createRoot(appNode).render(
  <KernelUIProvider runtime={runtime!}>
    <ReportsList />
  </KernelUIProvider>
);
```

---

## 13. Documentation Impact

- `README.md` – Update bootstrap instructions to feature `configureKernel()` and the adapter-based UI integration flow (no side-effect imports).
- `docs/guide/data.md` – Replace `withKernel()` walkthroughs with the unified bootstrap, event bus, and registry guidance.
- `docs/guide/actions.md` – Reflect the config-object action signature and lifecycle guarantees.
- `docs/api/useAction.md` – Document reliance on `KernelUIRuntime` for dispatch and state management.
- `docs/guide/reporting.md` – Note reporter onboarding through `configureKernel()` and child reporter helpers.
- `docs/packages/core.md` – Capture the canonical exports (`configureKernel`, `KernelEventBus`, instance helpers).
- `docs/packages/ui.md` – Describe `KernelUIRuntime`, `KernelUIProvider`, and the adapter pattern for attaching bindings.
- `docs/contributing/roadmap.md` – Align roadmap milestones with the unified bootstrap strategy.

## 14. Test Impact

- Update kernel integration tests (e.g., `packages/core/src/data/__tests__`) to exercise config-object signatures and event bus helpers.
- Adjust UI hook tests to attach via `KernelUIRuntime` rather than globals while preserving coverage baselines.
- Review end-to-end fixtures to bootstrap with `configureKernel()` and enable UI integration explicitly when required.

---

## 15. Glossary (Selected Terms)

- **KernelRegistry:** WordPress Data registry or compatible interface used for store registration and middleware.
- **Reporter:** Structured logging facility with channels and child reporter support.
- **PolicyMap:** Declarative map of capability checks keyed by policy identifier.
- **CacheKeyPattern:** Pattern string used for cache invalidation (e.g., `posts:*`).
- **GlobalKernelState:** Debug structure representing kernel runtime internals (stores, middleware, hooks).

---

End of specification.
