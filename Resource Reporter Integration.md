### ✓ **Status**

- `defineResource()` now resolves a scoped reporter for every resource and passes it
  through client methods, store resolvers, and grouped APIs.
- `configureKernel().defineResource()` threads the kernel reporter into resource
  definitions by default while allowing custom overrides.
- Client methods emit `debug`/`info`/`error` logs around transport calls, and store
  resolvers record success and failure paths for cache keys and queries.

### 🎯 **Primary Integration Points**

#### **1. Store Resolvers (store.ts lines 398-511)**

**Current Behavior**: Silent failures or basic error string storage
**Proposed Reporter Usage**: Structured logging of fetch operations
**Reporter Source**: Resolver receives `reporter` via store descriptor config (threaded from `defineResource`)

**Location**: store.ts

```typescript
// CURRENT (lines 398-425)
*getItem(id: string | number) {
  if (!resource.fetch) {
    throw new KernelError('NotImplementedError', { /* ... */ });
  }

  try {
    const item = (yield {
      type: 'FETCH_FROM_API',
      promise: resource.fetch(id),
    }) as T;
    yield actions.receiveItem(item);
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error';
    yield actions.receiveError(cacheKey, errorMessage);
  }
}

// WITH REPORTER
*getItem(id: string | number) {
  const reporter = getReporter(); // from config or kernel instance

  if (!resource.fetch) {
    reporter.error(`Resource "${resource.name}" fetch attempted without get route`, {
      resourceName: resource.name,
      operation: 'fetch',
      itemId: id,
    });
    throw new KernelError('NotImplementedError', { /* ... */ });
  }

  reporter.debug(`Fetching ${resource.name}`, { id, cacheKey });

  try {
    const item = (yield {
      type: 'FETCH_FROM_API',
      promise: resource.fetch(id),
    }) as T;

    reporter.info(`Fetched ${resource.name}`, { id, success: true });
    yield actions.receiveItem(item);
  } catch (error) {
    reporter.error(`Failed to fetch ${resource.name}`, {
      id,
      cacheKey,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error';
    yield actions.receiveError(cacheKey, errorMessage);
  }
}
```

**Same pattern applies to**:

- `getItems()` resolver (lines 425-458)
- `getList()` resolver (lines 462-511)

---

#### **2. Client Methods (client.ts)**

**Current Behavior**: Errors bubble up silently through `transportFetch`
**Proposed Reporter Usage**: Log outgoing requests and responses (debug/info/error around transport)
**Reporter Source**: `defineResource` passes resource-scoped reporter into `createClient`
**Transport Bridge**: Client decorates `transportFetch` call options with `meta` (`{ reporterNamespace, reporterContext }`) so the transport layer can emit richer events or adopt reporter support later without breaking API

**Location**: client.ts

```typescript
// WITH REPORTER
export function createClient<T, TQuery>(
  config: ResourceConfig<T, TQuery>,
  reporter?: Reporter  // Accept reporter from defineResource
): ResourceClient<T, TQuery> {
  const client: ResourceClient<T, TQuery> = {};

  const log = reporter || createNoopReporter();
  if (config.routes.list) {
    client.fetchList = async (query?: TQuery): Promise<ListResponse<T>> => {
      log.debug(`Fetching ${config.name} list`, { query });

      try {
        const response = await transportFetch<{...}>({
          path: config.routes.list!.path,
          method: 'GET',
          query: query as Record<string, unknown>,
        });

        log.info(`Fetched ${config.name} list`, {
          count: response.data.items?.length || 0,
          total: response.data.total
        });

        return { items: /* normalize */ };
      } catch (error) {
        log.error(`Failed to fetch ${config.name} list`, {
          query,
          error: error instanceof Error ? error.message : 'Unknown',
        });
        throw error;
      }
    };
  }

  // Same for fetch, create, update, remove...
}
```

---

#### **3. Resource Definition (define.ts)**

**Current Behavior**: No logging during resource creation or registration
**Proposed Reporter Usage**: Log resource lifecycle events and provide scoped reporter to client/store/cache/resolvers
**Reporter Source**: `configureKernel().defineResource` injects kernel reporter child; standalone `defineResource` fallback creates console reporter

**Location**: define.ts

```typescript
export function defineResource<T = unknown, TQuery = unknown>(
	config: ResourceConfig<T, TQuery>
): ResourceObject<T, TQuery> {
	const validated = validateConfig(config);
	const { namespace, resourceName } = resolveNamespaceAndName(validated);

	// GET REPORTER FROM KERNEL INSTANCE OR CREATE ONE
	const reporter =
		getKernelReporter()?.child(`resource.${resourceName}`) ||
		createReporter({
			namespace: `${namespace}.resource.${resourceName}`,
			channel: 'all',
			level: 'debug',
		});

	reporter.info(`Defining resource: ${resourceName}`, {
		namespace,
		routes: Object.keys(config.routes || {}),
		hasCacheKeys: !!config.cacheKeys,
	});

	const client = createClient(validated, reporter);
	const cacheKeys = config.cacheKeys || createDefaultCacheKeys(/* ... */);

	// ... rest of definition

	// Log when store is accessed
	let storeLogged = false;
	const storeGetter = {
		get() {
			if (!storeLogged) {
				reporter.debug(`Registering store for ${resourceName}`, {
					storeKey: `${namespace}/${resourceName}`,
				});
				storeLogged = true;
			}
			return createStore({ resource: obj, reporter });
		},
	};

	return obj;
}
```

---

#### **4. Cache Invalidation (`cache.ts`)**

**Current Behavior**: Silent invalidation operations
**Proposed Reporter Usage**: Track cache operations for debugging

```typescript
export function invalidate(
  patterns: CacheKeyPattern | CacheKeyPattern[],
  options: InvalidateOptions = {},
  reporter?: Reporter
): void {
  const log = reporter || getKernelReporter()?.child('cache') || createNoopReporter();

  log.debug('Cache invalidation requested', {
    patterns: Array.isArray(patterns) ? patterns : [patterns],
    targetStore: options.targetStore,
  });

  // ... existing invalidation logic

  const matchedKeys = /* ... */;

  log.info('Cache invalidated', {
    matchedKeys: matchedKeys.length,
    patterns: Array.isArray(patterns) ? patterns : [patterns],
  });
}
```

---

### 📊 **What Gets Logged**

| Level   | Scenario          | Message                                               | Context                               |
| ------- | ----------------- | ----------------------------------------------------- | ------------------------------------- |
| `debug` | Starting fetch    | `"Fetching {resource}"`                               | `{ id, cacheKey, query }`             |
| `info`  | Successful fetch  | `"Fetched {resource}"`                                | `{ id, count, success: true }`        |
| `info`  | Resource defined  | `"Defining resource: {name}"`                         | `{ namespace, routes, hasCacheKeys }` |
| `info`  | Cache invalidated | `"Cache invalidated"`                                 | `{ matchedKeys, patterns }`           |
| `warn`  | Cache miss        | `"Cache miss for {resource}"`                         | `{ id, cacheKey }`                    |
| `error` | Fetch failure     | `"Failed to fetch {resource}"`                        | `{ id, error, stack, cacheKey }`      |
| `error` | Missing route     | `"Resource {name} fetch attempted without get route"` | `{ resourceName, operation, itemId }` |

---

#### **5. Transport Layer (`http/fetch.ts`)**

**Current Behavior**: Emits WordPress hook events but has no awareness of reporter scope; failures are normalized to `KernelError` without structured logging.

**Proposed Reporter Usage**: Accept an optional `meta.reporter` (or namespace + resource metadata) to log request lifecycle events, keeping transport decoupled while enabling resource-level reporters to capture low-level signals.

```typescript
// transport/types.ts
export type TransportMeta = {
	reporter?: Reporter;
	resourceName?: string;
	namespace?: string;
};

export type TransportRequest<TData = unknown> = {
	path: string;
	method: HttpMethod;
	query?: Record<string, unknown>;
	data?: unknown;
	fields?: string[];
	meta?: TransportMeta;
};

// transport/fetch.ts
export async function fetch<TResponse>(
	request: TransportRequest<TResponse>
): Promise<TransportResponse<TResponse>> {
	const reporter =
		request.meta?.reporter ??
		getKernelReporter()?.child(
			`transport.${request.meta?.resourceName ?? 'unknown'}`
		) ??
		createNoopReporter();

	const requestId = generateRequestId();
	reporter.debug('Resource transport request', {
		requestId,
		path: request.path,
		method: request.method,
	});

	try {
		// existing fetch logic ...
		reporter.info('Resource transport response', {
			requestId,
			path: request.path,
			method: request.method,
		});
		return response;
	} catch (error) {
		reporter.error('Resource transport failed', {
			requestId,
			path: request.path,
			method: request.method,
			error,
		});
		throw normalizeError(error, requestId, request.method, request.path);
	}
}
```

**Call Site Impact**: Resource clients pass `meta: { reporter, resourceName: config.name, namespace: config.namespace }` so the transport automatically logs against the correct child reporter while remaining backwards compatible (meta optional).

---

#### **6. Reporter Propagation Helpers**

- `configureKernel()` exposes `kernel.getReporter()` so `kernel.defineResource()` can pass a namespaced child reporter into the resource factory.
- Standalone `defineResource()` (without kernel instance) falls back to `createReporter({ namespace: 'resource.{name}' })` ensuring reporters exist even in test setups.
- Cache utilities (`invalidate`, `registerStoreKey`) accept an optional reporter argument but default to `kernel.getReporter()?.child('cache')` to keep global invalidations logged.

---

#### **7. Testing & QA Checklist**

- **Unit Tests**
    - Client methods assert reporter.debug/info/error calls on success & failure.
    - Store resolvers verify reporter usage when routes are missing or errors occur.
    - Cache invalidation tests confirm reporter receives `debug` + `info` calls.
    - Transport unit tests cover reporter metadata propagation and error logging.
- **Integration Tests**
    - Kernel integration test ensures `kernel.defineResource()` wires the reporter through to clients, stores, and cache helpers.
    - Showcase / UI hooks smoke test asserts logs fire when fetching data in dev mode (can use mock reporter with spies).
- **Documentation Examples**
    - Update resource guide snippets to show reporter override (`defineResource({ reporter: customReporter })`).
    - Provide recipe for piping transport logs into external telemetry (e.g., Sentry).

---

### 🏗️ **Implementation Strategy**

1. **Resource Reporter Wiring**
    - Thread reporter from `configureKernel().defineResource()` into `createClient`, `createStore`, and grouped APIs (selectors/resolvers).
    - Add reporter parameter plumbing to store actions/resolvers and ensure cache error paths log appropriately.
    - Provide graceful fallbacks (`createNoopReporter`) for test environments without a kernel instance.
2. **Cache & Transport Telemetry**
    - Update cache invalidation helpers to accept reporter overrides while defaulting to kernel-scoped child reporters.
    - Extend `transportFetch` to consume optional reporter metadata, emitting request/response/failure logs.
    - Document reporter configuration patterns and update samples to showcase observability hooks.

---

### 🎯 **Benefits of Reporter Integration**

1. **Debugging Made Easy**
    - See exactly which resources are fetching
    - Track cache hit/miss rates
    - Identify slow or failing endpoints

2. **Production Observability**
    - Hook into external monitoring (Sentry, Datadog)
    - Track resource usage patterns
    - Alert on error rates

3. **Development Experience**
    - Clear console output during development
    - Trace resource lifecycle events
    - Understand data flow in complex UIs

4. **Consistent with Framework**
    - Actions already use reporters
    - Policies use reporters when `debug: true`
    - Resources complete the observability story

---

### ✓ **Recommendation**

**Priority**: Medium-High (after Sprint 6 alignment)

Resources should accept an optional `reporter` parameter that:

1. Defaults to creating a scoped reporter if none provided
2. Inherits from `kernel.getReporter()` when using `kernel.defineResource()`
3. Logs at appropriate levels based on operation type
4. Uses child reporters to maintain clear namespacing (`{namespace}.resource.{name}.{operation}`)

This would make resources a **full observability citizen** alongside actions and policies, completing the structured logging story across the entire framework.
