# Resources

> **Status**: ✅ Core API implemented in Sprint 1 (A2)

Resources define your data contract. One definition gives you:

- Typed REST client with automatic method generation
- Store keys for @wordpress/data integration
- Cache key generators for invalidation
- Type-safe TypeScript generics

## Overview

Resources are the canonical way to declare REST endpoints in WP Kernel. Instead of manually creating fetch calls and managing state, you define a resource once and get:

1. **Typed client methods** - `list()`, `get()`, `create()`, `update()`, `remove()`
2. **Store key** - For @wordpress/data registration (e.g., `gk/thing`)
3. **Cache keys** - Functions to generate cache keys for invalidation
4. **Validation** - Config validation at dev-time with clear error messages

## Quick Start

```typescript
import { defineResource } from '@geekist/wp-kernel/resource';

interface Thing {
	id: number;
	title: string;
	description: string;
}

interface ThingQuery {
	q?: string;
	page?: number;
}

export const thing = defineResource<Thing, ThingQuery>({
	name: 'thing',
	routes: {
		list: { path: '/gk/v1/things', method: 'GET' },
		get: { path: '/gk/v1/things/:id', method: 'GET' },
		create: { path: '/gk/v1/things', method: 'POST' },
		update: { path: '/gk/v1/things/:id', method: 'PUT' },
		remove: { path: '/gk/v1/things/:id', method: 'DELETE' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q, q?.page],
		get: (id) => ['thing', 'get', id],
	},
});

// Use the resource
const items = await thing.list({ q: 'search', page: 1 });
const item = await thing.get(123);
const created = await thing.create({ title: 'New Thing' });
```

## Configuration

### Required Properties

#### `name` (string)

Unique resource name (lowercase, kebab-case recommended).

- Used for store keys (`gk/{name}`)
- Used for event names
- Must match `/^[a-z][a-z0-9-]*$/`

```typescript
// ✅ Good
defineResource({
	name: 'thing',
	routes: {
		/* ... */
	},
});
defineResource({
	name: 'blog-post',
	routes: {
		/* ... */
	},
});
defineResource({
	name: 'user-profile',
	routes: {
		/* ... */
	},
});

// ❌ Bad - will throw DeveloperError
defineResource({
	name: 'Thing',
	routes: {
		/* ... */
	},
}); // uppercase
defineResource({
	name: 'my_thing',
	routes: {
		/* ... */
	},
}); // underscores
defineResource({
	name: 'my thing',
	routes: {
		/* ... */
	},
}); // spaces
```

#### `routes` (object)

REST route definitions. At least one route must be defined.

Each route has:

- `path` (string) - REST endpoint path (may include `:id`, `:slug` params)
- `method` (HttpMethod) - HTTP method: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`

```typescript
routes: {
  list: { path: '/gk/v1/things', method: 'GET' },
  get: { path: '/gk/v1/things/:id', method: 'GET' },
  create: { path: '/gk/v1/things', method: 'POST' },
  update: { path: '/gk/v1/things/:id', method: 'PUT' },
  remove: { path: '/gk/v1/things/:id', method: 'DELETE' }
}
```

**Path Parameters**: Use `:paramName` syntax for dynamic segments:

```typescript
// Single parameter
'/gk/v1/things/:id'; // thing.get(123) becomes '/gk/v1/things/123'

// Multiple parameters
'/gk/v1/things/:id/comments/:commentId';
// thing.getComment(42, 99) becomes '/gk/v1/things/42/comments/99'

// Supported patterns: :id, :slug, :userId, :_id, :$id
```

### Optional Properties

#### `cacheKeys` (object)

Functions to generate cache keys for each operation. If omitted, default keys based on resource name will be generated.

```typescript
cacheKeys: {
  list: (query) => ['thing', 'list', query?.q, query?.page],
  get: (id) => ['thing', 'get', id],
  create: (data) => ['thing', 'create', Date.now()],
  update: (id) => ['thing', 'update', id],
  remove: (id) => ['thing', 'remove', id]
}
```

**Default cache keys** (if not provided):

```typescript
{
  list: (query) => ['thing', 'list', JSON.stringify(query || {})],
  get: (id) => ['thing', 'get', id],
  create: (data) => ['thing', 'create', JSON.stringify(data || {})],
  update: (id) => ['thing', 'update', id],
  remove: (id) => ['thing', 'remove', id]
}
```

#### `schema` (`Promise<unknown>`)

JSON Schema for runtime validation (coming in future sprints).

```typescript
schema: import('../../contracts/thing.schema.json');
```

## Generated Client Methods

Based on your configured routes, `defineResource` generates typed client methods:

### list()

**Signature**: `list(query?): Promise<ListResponse<T>>`

Fetch a collection of resources.

```typescript
const { items, total, hasMore, nextCursor } = await thing.list({
	q: 'search term',
	page: 1,
});
```

**ListResponse** includes:

- `items: T[]` - Array of resources
- `total?: number` - Total count (if available)
- `hasMore?: boolean` - Whether more pages exist
- `nextCursor?: string` - Pagination cursor

### get()

**Signature**: `get(id): Promise<T>`

Fetch a single resource by ID.

```typescript
const item = await thing.get(123);
```

### create()

**Signature**: `create(data): Promise<T>`

Create a new resource.

```typescript
const created = await thing.create({
	title: 'New Thing',
	description: 'A new thing',
});
```

### update()

**Signature**: `update(id, data): Promise<T>`

Update an existing resource.

```typescript
const updated = await thing.update(123, {
	title: 'Updated Title',
});
```

### remove()

**Signature**: `remove(id): Promise<void>`

Delete a resource.

```typescript
await thing.remove(123);
```

## Using Resource Metadata

### Store Key

Access the store key for @wordpress/data integration:

```typescript
console.log(thing.storeKey); // 'gk/thing'

// Use with @wordpress/data selectors (coming in A3)
const items = useSelect((select) => select(thing.storeKey).getItems());
```

### Cache Keys

Generate cache keys for invalidation:

```typescript
import { invalidate } from '@geekist/wp-kernel';

// After creating a thing
await thing.create(data);
invalidate(thing.cacheKeys.list({ q: 'search' }));

// After updating
await thing.update(id, data);
invalidate(thing.cacheKeys.get(id));
invalidate(thing.cacheKeys.list({}));
```

## TypeScript Generics

Resources support two generic type parameters:

### `T` - Resource Entity Type

The shape of your resource object.

```typescript
interface Thing {
	id: number;
	title: string;
	description: string;
	createdAt: string;
}

const thing = defineResource<Thing>({ ... });

// Methods are now fully typed
const item: Thing = await thing.get(123);
```

### `TQuery` - List Query Parameters

The shape of query parameters for list operations.

```typescript
interface ThingQuery {
	q?: string;
	category?: string;
	page?: number;
	perPage?: number;
}

const thing = defineResource<Thing, ThingQuery>({ ... });

// Query parameter types are enforced
await thing.list({ q: 'search', page: 1 }); // ✅
await thing.list({ invalid: 'param' });      // ❌ TypeScript error
```

## Validation & Errors

`defineResource` validates your configuration at dev-time and throws `DeveloperError` for invalid configs:

```typescript
// ❌ Missing name
defineResource({ routes: { ... } });
// DeveloperError: Resource config must have a valid "name" property

// ❌ Invalid name format
defineResource({ name: 'My_Thing', routes: { ... } });
// DeveloperError: Resource name must be lowercase with hyphens only (kebab-case)

// ❌ No routes
defineResource({ name: 'thing', routes: {} });
// DeveloperError: Resource "thing" must define at least one route

// ❌ Invalid HTTP method
defineResource({
  name: 'thing',
  routes: { list: { path: '/api', method: 'FETCH' } }
});
// DeveloperError: Invalid HTTP method "FETCH"
```

## Partial Resource Definitions

You don't need to define all CRUD operations. Define only what your resource supports:

```typescript
// Read-only resource
const readOnlyThing = defineResource<Thing>({
	name: 'read-only-thing',
	routes: {
		list: { path: '/gk/v1/things', method: 'GET' },
		get: { path: '/gk/v1/things/:id', method: 'GET' },
	},
});

// Methods not defined will be undefined
readOnlyThing.list(); // ✅ Available
readOnlyThing.get(1); // ✅ Available
readOnlyThing.create; // undefined (not configured)
```

## Advanced Patterns

### Custom HTTP Methods

Use `PATCH` for partial updates:

```typescript
routes: {
  update: { path: '/gk/v1/things/:id', method: 'PATCH' }
}
```

### Nested Resources

Define nested resource paths:

```typescript
const comment = defineResource<Comment>({
	name: 'comment',
	routes: {
		list: {
			path: '/gk/v1/things/:thingId/comments',
			method: 'GET',
		},
		get: {
			path: '/gk/v1/things/:thingId/comments/:id',
			method: 'GET',
		},
	},
});

// Use with multiple path parameters
// Note: Current implementation will need enhancement for multi-param support
```

### Custom Cache Strategy

Customize cache keys for your use case:

```typescript
cacheKeys: {
  // Include timestamp for time-sensitive data
  list: (q) => ['thing', 'list', q?.q, Math.floor(Date.now() / 60000)],

  // Include user context
  get: (id) => ['thing', 'get', id, currentUserId],

  // Different keys per query param combination
  list: (q) => {
    const parts = ['thing', 'list'];
    if (q?.category) parts.push('cat', q.category);
    if (q?.status) parts.push('status', q.status);
    return parts;
  }
}
```

## Current Limitations (Sprint 1)

::: warning Transport Not Yet Implemented
Client methods currently throw `NotImplementedError`. Transport integration is coming in **A3: Store Factory**.
:::

```typescript
// Current behavior
await thing.list(); // ❌ Throws NotImplementedError

// After A3 (next task)
await thing.list(); // ✅ Makes actual REST call
```

## Best Practices

### 1. Co-locate with Types

Define resource and types together:

```typescript
// resources/thing.ts
export interface Thing {
	id: number;
	title: string;
}

export interface ThingQuery {
	q?: string;
}

export const thing = defineResource<Thing, ThingQuery>({ ... });
```

### 2. Use Consistent Naming

Match resource name to WordPress REST endpoint:

```typescript
// WordPress REST: /wp/v2/posts
name: 'post';

// Custom REST: /gk/v1/things
name: 'thing';
```

### 3. Define Granular Cache Keys

More specific cache keys = better invalidation control:

```typescript
// ❌ Too broad
cacheKeys: {
	list: () => ['thing', 'list']; // Invalidates ALL lists
}

// ✅ Granular
cacheKeys: {
	list: (q) => ['thing', 'list', q?.category, q?.status];
}
```

### 4. Type Your Queries

Always define query parameter types:

```typescript
// ❌ No query type
defineResource<Thing>({ ... })  // list() accepts any query

// ✅ Typed query
defineResource<Thing, ThingQuery>({ ... })  // list() enforces ThingQuery
```

## See Also

- [API Reference](/api/resources) - Complete API documentation
- [Actions Guide](/guide/actions) - Using resources in actions
- [Quick Start](/getting-started/quick-start) - Build your first resource
- [Product Spec § 4.1](https://github.com/theGeekist/wp-kernel/blob/main/information/Product%20Specification%20PO%20Draft%20•%20v1.0.md#41-resources-model--client) - Design rationale
