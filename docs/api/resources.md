# Resources API

> **Status**: 🚧 Auto-generated API docs coming in Sprint 1+

## `defineResource<T, Q>(config)`

Define a typed REST resource with client methods, store, and cache keys.

### Type Parameters

- `T` - The resource entity type
- `Q` - Query parameters type (optional)

### Config Object

```typescript
{
  name: string;           // Resource name (singular)
  routes: {               // REST endpoints
    list?: RouteConfig;
    get?: RouteConfig;
    create?: RouteConfig;
    update?: RouteConfig;
    remove?: RouteConfig;
    [custom: string]: RouteConfig;
  };
  schema: Promise<JSONSchema>;  // JSON Schema for validation
  cacheKeys: {            // Cache key generators
    list?: (query?: Q) => string[];
    get?: (id: string | number) => string[];
    [custom: string]: (...args: any[]) => string[];
  };
}
```

### Returns

A resource object with:

- Client methods: `list()`, `get()`, `create()`, `update()`, `remove()`
- Store integration (automatic)
- Cache key management

### Example

See [Quick Start](/getting-started/quick-start#step-1-define-a-resource) for a complete example.

## `invalidate(patterns, options?)`

Invalidate cached data matching the given cache key patterns.

This is the primary cache invalidation API used by Actions to ensure UI reflects updated data after write operations.

### Parameters

- `patterns` - Cache key pattern(s) to invalidate
    - Single pattern: `['resource', 'operation', ...params]`
    - Multiple patterns: `[['resource1', 'list'], ['resource2', 'list']]`
- `options` - Optional configuration
    - `storeKey?: string` - Target specific store (e.g., 'gk/thing'), omit to invalidate across all stores
    - `emitEvent?: boolean` - Whether to emit `wpk.cache.invalidated` event (default: `true`)

### Pattern Matching

Cache key patterns support prefix matching:

- `['thing', 'list']` matches all list queries: `thing:list`, `thing:list:active`, `thing:list:active:page:2`
- `['thing', 'list', 'active']` matches only active list queries
- `['thing', 'get', 123]` matches a specific item query

### Examples

```typescript
import { invalidate } from '@geekist/wp-kernel';

// Invalidate all list queries for 'thing' resource
invalidate(['thing', 'list']);

// Invalidate specific query
invalidate(['thing', 'list', 'active']);

// Invalidate across multiple resources
invalidate([
	['thing', 'list'],
	['job', 'list'],
]);

// Target specific store
invalidate(['thing', 'list'], { storeKey: 'gk/thing' });

// Skip event emission
invalidate(['thing', 'list'], { emitEvent: false });
```

### Usage in Actions

```typescript
import { defineAction } from '@geekist/wp-kernel';
import { invalidate } from '@geekist/wp-kernel';
import { thing } from '@/app/resources/thing';

export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
	const created = await thing.create(data);

	// Invalidate list caches so UI refreshes
	invalidate(['thing', 'list']);

	return created;
});
```

## `invalidateAll(storeKey)`

Clear all cached data in a specific store.

### Parameters

- `storeKey` - The store key to invalidate (e.g., 'gk/thing')

### Example

```typescript
import { invalidateAll } from '@geekist/wp-kernel';

// Clear all cached data for 'thing' resource
invalidateAll('gk/thing');
```

## Cache Key Utilities

### `normalizeCacheKey(pattern)`

Normalize a cache key pattern to a string representation.

```typescript
import { normalizeCacheKey } from '@geekist/wp-kernel';

normalizeCacheKey(['thing', 'list']); // → 'thing:list'
normalizeCacheKey(['thing', 'list', null]); // → 'thing:list' (filters nulls)
```

### `matchesCacheKey(key, pattern)`

Check if a cache key matches a pattern (supports prefix matching).

```typescript
import { matchesCacheKey } from '@geekist/wp-kernel';

matchesCacheKey('thing:list:active', ['thing', 'list']); // → true
matchesCacheKey('thing:get:123', ['thing', 'list']); // → false
```
