# UI Package Architecture Fix – Specification

**Version:** 1.0  
**Status:** Proposed (not yet implemented)  
**Related doc:** `configureKernel - Specification.md`

---

## 1. Problem Statement

`@geekist/wp-kernel-ui` currently attaches React hooks (`useGet`, `useList`, `useAction`, `usePolicy`) by mutating globals when the module is imported. Resources enqueue themselves until the UI bundle loads, at which point hooks are patched onto each resource. The package also pokes `global.__WP_KERNEL_ACTION_RUNTIME__` to graft in reporters and policy adapters. This approach produces:

- Hidden coupling between the UI bundle and the kernel package (`import '@geekist/wp-kernel-ui'` must run before any resource usage).
- Load-order fragility when the UI bundle is code-split or loaded lazily.
- Divergent reporter/registry configuration because the UI package duplicates bootstrap logic.
- Inability to tree-shake UI code in non-React or headless scenarios.
- No clear extension point for upcoming UI primitives (React components, Interactivity API helpers, or custom elements).

The immediate hook problem is a symptom of a larger issue: the UI package lacks an explicit runtime contract with the kernel instance. Without that contract it cannot scale to additional primitives or operate standalone.

---

## 2. Intended Role of the UI Package

The UI package should be the framework’s presentation layer. Its responsibilities span more than hooks:

- **React hooks & components** – `useAction`, `ActionButton`, `ResourceForm`, DataViews integrations.
- **Non-React primitives** – Script Modules, Interactivity API bindings, web components, and PHP-rendered views that rely on kernel services.
- **UX scaffolding** – Notices, toasts, skeletons, and policy-aware gating helpers.
- **Developer tooling** – Debug overlays, storybook harnesses, and testing utilities.
- **Namespace awareness** – UI adapters respect the kernel’s namespace helpers
  (`@geekist/wp-kernel/namespace`) so emitted events and store keys always align
  with the configured namespace.

To fulfill this role the package must:

1. Share configuration (namespace, reporter, registry, policy runtime) with the kernel.
2. Remain optionally consumable without the kernel (e.g., Playground demos or future standalone clients) by supplying an adapter.
3. Avoid touching globals directly; instead consume a documented runtime contract.
4. Provide consistent error handling via `KernelError` subclasses.

---

## 3. Design Principles

1. **Symmetric Integration:** When paired with `configureKernel()`, UI features inherit identical configuration. No duplicate bootstrap.
2. **Adapter-Friendly:** UI primitives operate using a `KernelUIRuntime` abstraction. Kernel integration is one adapter; others can bridge to mock data or alternate registries.
3. **Tree-Shakeable:** Importing hooks or components should not drag in the entire UI surface. Side-effect-only imports are eliminated.
4. **Component-Ready:** The runtime must power both hooks and higher-level components (React and non-React) through the same service layer.
5. **No Global Mutation:** All coordination happens through explicit runtime APIs or events emitted by the kernel instance.
6. **One-Way Dependency:** The kernel never imports UI modules; adapters supplied by the application bridge the two packages.

---

## 4. Current State Summary

- Resources push themselves into a global queue if hooks are not yet attached (`pendingResources[]`).
- `@geekist/wp-kernel-ui` registers a global callback (`__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__`) and flushes the queue during import.
- Hooks call `getWPData()`, register internal stores, and rely on `withKernel()` having run.
- Components referenced in README are not yet implemented; there is no shared UI runtime to host them.

This architecture does not scale once components and additional primitives arrive; each feature would need to repeat the same global dance.

---

## 5. Proposed Architecture

### 5.1 KernelUIRuntime (Core Contract)

Introduce a runtime object that encapsulates everything the UI layer needs. Conceptually:

```typescript
interface KernelUIRuntime {
	kernel?: KernelInstance; // Present in paired mode
	namespace: string;
	reporter: Reporter;
	registry?: KernelRegistry;
	policies: PolicyRuntime;
	actions: ActionRuntime;
	resources: ResourceRegistry;
	events: KernelEventBus;
}
```

Key characteristics:

- Created either by `configureKernel()` (paired mode) or by a standalone factory (`createKernelUIRuntime(adapter)`).
- Exposes subscription APIs so hooks and components receive updates without polling.
- Provides factories for attaching UI-specific behavior to resources/actions as they are defined.

### 5.2 Integration Modes

**Paired Mode (default):**

- Applications call `configureKernel({ ui: { attach: attachUIBindings, options } })`, passing the adapter exported from the UI package.
- `configureKernel()` stores the adapter reference and either invokes it immediately or exposes `kernel.attachUIBindings()` for delayed execution-no kernel → UI import is required.
- `attachUIBindings(kernel, options)` builds the `KernelUIRuntime`, registers listeners on `kernel.events` (e.g., `resource:defined`, `action:defined`), and attaches hooks/components synchronously.
- UI exports consume the runtime via `KernelUIProvider`/`useKernelUI` while staying decoupled from kernel internals.

**Standalone Mode:**

- `createKernelUIRuntime({ adapter })` allows demos/tests to supply their own implementations (e.g., mock registry, custom reporter).
- Hooks/components accept an explicit runtime or read it from `KernelUIProvider`.
- Feature parity is limited to what the adapter supports; components must degrade gracefully (e.g., no notices bridge).

### 5.3 Resource & Action Binding

- Replace the global queue with kernel events. `defineResource()` emits `resource:defined` with the new resource object.
- UI runtime registers listeners to decorate resources (`resource.useGet`, `resource.useList`) and actions (`useAction` controllers) synchronously, using
  the namespace information already computed by the kernel.
- Hooks throw a `UIHooksDisabledError` when called without a runtime that supports them.

### 5.4 Components and Primitives

**React Components:**  
Components (e.g., `ActionButton`, `ResourceTable`, `PolicyGate`) use the runtime via `KernelUIContext`. They receive helpers (`runtime.actions.getController(action)`) that manage lifecycle, reporting, and cache invalidation.

**Non-React Primitives:**  
Expose utilities such as `createResourceController(resource)` and `createActionController(action)` that ship as plain JS classes. They interact with the same runtime but emit DOM events (using the Interactivity API or custom elements) so PHP-rendered templates and vanilla JS can participate.

**Testing Utilities:**  
Provide `createMockUIRuntime()` for unit tests, ensuring components/hooks can run without a full kernel.

### 5.5 Reporter & Error Handling

- UI runtime reuses the reporter through `kernel.getReporter()` (paired) or adapter-provided reporter (standalone).
- Components surface errors via typed boundaries (`KernelUIBoundary`) that convert `KernelError` subclasses into user-facing notices.

### 5.6 Package Layout

```
packages/ui/src/
  runtime/              # KernelUIRuntime creation & adapters
  hooks/                # React hooks that consume runtime
  components/           # React components using hooks/runtime
  elements/             # Non-React primitives (custom elements / controllers)
  providers/KernelUIProvider.tsx
  index.ts              # Explicit exports, no side effects
```

---

## 6. API Surface Proposal

```typescript
// packages/ui/src/runtime/createKernelUIRuntime.ts
export interface UIIntegrationOptions {
	suspense?: boolean;
	notices?: boolean;
	devtools?: boolean;
}

export function attachUIBindings(
	kernel: KernelInstance,
	options?: UIIntegrationOptions
): KernelUIRuntime;
export function createKernelUIRuntime(
	adapter: KernelUIAdapter
): KernelUIRuntime;

// React entry point
export const KernelUIProvider: React.FC<{ runtime: KernelUIRuntime }>;
export function useKernelUI(): KernelUIRuntime;

// Hooks now consume runtime context rather than touching globals directly
export function useResourceItem<T>(
	resource: ResourceObject<T>,
	id: string | number
): UseResourceItemResult<T>;
export function useResourceList<T, Q>(
	resource: ResourceObject<T, Q>,
	query?: Q
): UseResourceListResult<T>;
export function useAction<TArgs, TResult>(
	action: DefinedAction<TArgs, TResult>,
	options?: UseActionOptions<TArgs, TResult>
): UseActionResult<TArgs, TResult>;
export function usePolicy<K extends PolicyMapKey>(
	policyKey: K
): PolicyResult<K>;

// Components
export const ActionButton: React.FC<ActionButtonProps>;
export const ResourceForm: React.FC<ResourceFormProps>;

// Non-React helpers
export function createActionController(
	action: DefinedAction<any, any>,
	runtime?: KernelUIRuntime
): ActionController;
export function createResourceController(
	resource: ResourceObject<any, any>,
	runtime?: KernelUIRuntime
): ResourceController;
```

Applications typically import `attachUIBindings` and pass it to `configureKernel({ ui: { attach: attachUIBindings } })`, ensuring the kernel never needs to import the UI package. For delayed integration, the same adapter can be supplied to `kernel.attachUIBindings(attachUIBindings, options)` after configuration.

When `configureKernel({ ui: { attach: attachUIBindings, options } })` is called:

```typescript
const kernel = configureKernel({
  namespace: 'my-plugin',
  registry,
  ui: {
    attach: attachUIBindings,
    options: { suspense: true },
  },
});

// React root
const runtime = kernel.getUIRuntime(); // convenience getter
createRoot(node).render(
  <KernelUIProvider runtime={runtime}>
    <App />
  </KernelUIProvider>
);
```

Standalone usage:

```typescript
import { createKernelUIRuntime, KernelUIProvider } from '@geekist/wp-kernel-ui/runtime';
import { memoryAdapter } from './adapters/memory';

const runtime = createKernelUIRuntime(memoryAdapter());

createRoot(node).render(
  <KernelUIProvider runtime={runtime}>
    <Playground />
  </KernelUIProvider>
);
```

---

## 7. Compatibility & Migration Strategy

1. **Phase 1 – Dual Mode:** Keep the legacy side-effect entry (`import '@geekist/wp-kernel-ui'`) but implement it as a thin shim that calls `kernel.getUIRuntime().legacyAttachResources()` if available, otherwise warns developers to supply an adapter via `configureKernel({ ui: { attach: attachUIBindings } })`.
2. **Phase 2 – Event Binding:** Update `defineResource()` and `defineAction()` to emit lifecycle events. Deprecate the global queue and rely on events for hook attachment.
3. **Phase 3 – Component Rollout:** As components land, they consume the runtime and require either paired or standalone initialization.
4. **Phase 4 – Remove Legacy:** After consumers migrate, drop globals and side-effect import path.

Throughout migration, maintain `KernelError` usage, ensure SSR-safe guards remain, and keep hooks throwing descriptive errors when the runtime is missing.

---

## 8. Long-Term Placement in the Framework

- The kernel remains the source of truth for domain logic, actions, resources, and policies.
- The UI package hosts presentation-layer primitives powered by `KernelUIRuntime`.
- `configureKernel - Specification.md` governs the kernel bootstrap; this document governs the UI bridge. The two specs intersect at the `attachUIBindings()` integration point.
- Future packages (e.g., block bindings) can depend on `KernelUIRuntime` without importing React, ensuring consistent behavior across interfaces.

---

## 9. Documentation Impact

- `README.md` – Surface `KernelUIProvider`, paired usage, and removal of side-effect imports.
- `docs/packages/ui.md` – Document the runtime-centric architecture, new directory layout, and adapter story.
- `docs/api/useAction.md` – Refresh setup steps to mention dispatcher resolution via the runtime.
- `docs/guide/actions.md` – Cross-reference UI helpers powered by the runtime and clarify migration steps.
- `docs/guide/resources.md` / `docs/guide/prefetching.md` – Replace references to global hook attachment with runtime-based binding and update example imports.

## 10. Test Impact

- Update `packages/ui/src/hooks/__tests__` to build a `KernelUIRuntime` (paired or adapter-based) before asserting hook behavior.
- Ensure showcase demos and integration snapshots import UI bindings through runtime-aware entry points.
- Review Storybook/component tests (present or forthcoming) to rely on `KernelUIProvider` for context instead of global mocks.

---

End of specification.
