# Resources

> **Status**: ✅ Core API implemented in Sprint 1 (A2: defineResource, A3: Store & Transport, A4: Cache Invalidation)

Resources define your data contract. One definition gives you:

- Typed REST client with automatic method generation
- WordPress data store integration
- Cache key generators for invalidation
- Full TypeScript type safety

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
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
		create: { path: '/wpk/v1/things', method: 'POST' },
		update: { path: '/wpk/v1/things/:id', method: 'PUT' },
		remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q, q?.page],
		get: (id) => ['thing', 'get', id],
	},
});

// Use the resource client
const { items, total, hasMore, nextCursor } = await thing.list({ q: 'search', page: 1 });
const item = await thing.get(123);
const created = await thing.create({ title: 'New Thing' });

// Use the resource store
import { useSelect } from '@wordpress/data';

function ThingList() {
	const items = useSelect((select) =>
		select(thing.store).getItems({ q: 'search' })
	);

	return <ul>{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>;
}
```

## Configuration

### Required Properties

#### `name` \<string\>

Unique resource name (lowercase, kebab-case recommended).

- Used for store keys (`wpk/{name}`)
- Used for event names
- Must match `/^[a-z][a-z0-9-]*$/`

```typescript
// ✅ Good
name: 'thing';
name: 'blog-post';
name: 'user-profile';

// ❌ Bad - throws DeveloperError
name: 'Thing'; // uppercase
name: 'my_thing'; // underscores
name: 'my thing'; // spaces
```

#### `routes` \<object\>

REST route definitions. At least one route must be defined.

Each route has:

- `path` (string) - REST endpoint path with optional `:param` placeholders
- `method` (HttpMethod) - `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`

```typescript
routes: {
  list: { path: '/wpk/v1/things', method: 'GET' },
  get: { path: '/wpk/v1/things/:id', method: 'GET' },
  create: { path: '/wpk/v1/things', method: 'POST' },
  update: { path: '/wpk/v1/things/:id', method: 'PUT' },
  remove: { path: '/wpk/v1/things/:id', method: 'DELETE' }
}
```

**Path Parameters**: Multi-segment paths with multiple parameters are fully supported (A3+):

```typescript
// Single parameter
'/wpk/v1/things/:id'; // → /wpk/v1/things/123

// Multiple parameters
'/wpk/v1/things/:id/comments/:commentId'; // → /wpk/v1/things/42/comments/99

// Supported patterns: :id, :slug, :userId, :_id, :$id
```

````

::: tip Path Parameter Support
Multi-parameter interpolation is available from Sprint 1 (A3: Store & Transport). Earlier versions support single parameters only.
:::

### Optional Properties

#### `cacheKeys` \<object\>

Functions to generate cache keys for each operation. Defaults to sensible keys if omitted.

```typescript
cacheKeys: {
  list: (query) => ['thing', 'list', query?.q, query?.page],
  get: (id) => ['thing', 'get', id],
  create: (data) => ['thing', 'create'],
  update: (id) => ['thing', 'update', id],
  remove: (id) => ['thing', 'remove', id]
}
````

::: warning Avoid Timestamps in Cache Keys
Don't use `Date.now()` or timestamps in cache keys—it makes invalidation impossible. Use timestamps only for specific time-sensitive use cases (see Advanced Patterns).
:::

#### `schema` \<Promise\<unknown\>\>

JSON Schema for runtime validation (coming in future sprints).

```typescript
schema: import('../../contracts/thing.schema.json');
```

### TypeScript Generics

Resources accept two generic type parameters:

```typescript
defineResource<T, TQuery>({...})
//              ^  ^^^^^^
//              |  Query parameters type (for list)
//              Resource entity type
```

#### `T` - Resource Entity Type

```typescript
interface Thing {
	id: number;
	title: string;
	description: string;
}

const thing = defineResource<Thing>({ ... });

// Methods are fully typed
const item: Thing = await thing.get(123);
```

#### `TQuery` - List Query Parameters

```typescript
interface ThingQuery {
	q?: string;
	category?: string;
	page?: number;
}

const thing = defineResource<Thing, ThingQuery>({ ... });

// Query types are enforced
await thing.list({ q: 'search', page: 1 }); // ✅
await thing.list({ invalid: 'param' });      // ❌ TypeScript error
```

### Validation

`defineResource` validates configuration at dev-time and throws `DeveloperError` for issues:

```typescript
// ❌ Missing name
defineResource({ routes: { ... } });
// DeveloperError: Resource config must have a valid "name" property

// ❌ Invalid name format
defineResource({ name: 'My_Thing', routes: { ... } });
// DeveloperError: Resource name must be lowercase with hyphens only

// ❌ No routes
defineResource({ name: 'thing', routes: {} });
// DeveloperError: Resource "thing" must define at least one route

// ❌ Invalid HTTP method
defineResource({ name: 'thing', routes: { list: { path: '/api', method: 'FETCH' } } });
// DeveloperError: Invalid HTTP method "FETCH"
```

## Client Methods

Based on configured routes, resources generate typed client methods:

### list(query?)

Fetch a collection of resources. **Always destructure the response** to access items and metadata.

```typescript
const { items, total, hasMore, nextCursor } = await thing.list({
	q: 'search',
	page: 1,
});
```

**Returns**: `Promise<ListResponse<T>>`

- `items: T[]` - Array of resources
- `total?: number` - Total count (if available)
- `hasMore?: boolean` - Whether more pages exist
- `nextCursor?: string` - Pagination cursor

### get(id)

Fetch a single resource by ID.

```typescript
const item: Thing = await thing.get(123);
```

**Returns**: `Promise<T>`

### create(data)

Create a new resource.

```typescript
const created = await thing.create({
	title: 'New Thing',
	description: 'Details',
});
```

**Returns**: `Promise<T>`

### update(id, data)

Update an existing resource.

```typescript
const updated = await thing.update(123, { title: 'Updated Title' });
```

**Returns**: `Promise<T>`

### remove(id)

Delete a resource.

```typescript
await thing.remove(123);
```

**Returns**: `Promise<void>`

## Store Integration

Each resource provides a `@wordpress/data` store for state management. The store is lazy-loaded and auto-registered on first access.

### Basic Usage

```typescript
import { useSelect } from '@wordpress/data';

function ThingList() {
	const items = useSelect((select) =>
		select(thing.store).getItems({ q: 'search' })
	);

	return <ul>{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>;
}
```

### Store Selectors

The store provides different selectors depending on whether you need just the items array or the full response with metadata.

#### `getItem(id)` - Get single item by ID

```typescript
const item = useSelect((select) => select(thing.store).getItem(123));
```

#### `getItems(query)` - Get items array only

Returns **just the array of items** from a list query. Use when you only need the items and not pagination metadata.

```typescript
const items: Thing[] = useSelect((select) =>
	select(thing.store).getItems({ q: 'search' })
);
```

#### `getList(query)` - Get full response with metadata

Returns the **complete ListResponse** including items, total, hasMore, and nextCursor. Use when you need pagination metadata.

```typescript
const { items, total, hasMore, nextCursor } = useSelect((select) =>
	select(thing.store).getList({ q: 'search', page: 1 })
);
```

#### `getError(cacheKey)` - Get error for cache key

```typescript
const error = useSelect((select) =>
	select(thing.store).getError('thing:get:123')
);
```

#### Resolution Status

```typescript
const isLoading = useSelect((select) =>
	select(thing.store).isResolving('getItem', [123])
);
```

### Store Resolvers

Resolvers automatically fetch data when selectors are called with missing data:

```typescript
function ThingDetail({ id }) {
	// Automatically fetches if not in store
	const item = useSelect((select) => select(thing.store).getItem(id));

	if (!item) return <div>Loading...</div>;
	return <div>{item.title}</div>;
}
```

### Store Actions

```typescript
import { dispatch } from '@wordpress/data';

// Update store state manually (typically done by Actions layer)
dispatch(thing.store).receiveItem({ id: 123, title: 'Thing' });
dispatch(thing.store).receiveError('thing:get:123', 'Not found');

// Invalidate cache
dispatch(thing.store).invalidate(['thing:list:search']);
dispatch(thing.store).invalidateAll();
```

::: info Resource Events
Resources automatically emit events during transport operations:

- `wpk.resource.request` - Before REST call
- `wpk.resource.response` - After successful response
- `wpk.resource.error` - On request failure

See [Events Guide](/guide/events) for full event taxonomy and hooking patterns.
:::

### Complete Example

```typescript
import { defineResource } from '@geekist/wp-kernel/resource';
import { useSelect } from '@wordpress/data';

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
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q, q?.page],
		get: (id) => ['thing', 'get', id],
	},
});

function ThingList() {
	const { items, isLoading } = useSelect((select) => {
		const store = select(thing.store);
		return {
			items: store.getItems({ q: 'search' }),
			isLoading: store.isResolving('getItems', [{ q: 'search' }]),
		};
	});

	if (isLoading) return <div>Loading...</div>;

	return (
		<ul>
			{items.map((item) => (
				<li key={item.id}>
					<h3>{item.title}</h3>
					<p>{item.description}</p>
				</li>
			))}
		</ul>
	);
}
```

## Cache Invalidation

Use the `invalidate()` function to clear stale cache after writes:

```typescript
import { invalidate } from '@geekist/wp-kernel';

// In an Action
export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
	const created = await thing.create(data);

	// Invalidate affected caches
	invalidate(thing.cacheKeys.list({}));

	return created;
});

// Invalidate specific query
invalidate(thing.cacheKeys.list({ q: 'search' }));

// Invalidate all lists matching pattern
invalidate(['thing', 'list']); // Matches all thing:list:* keys

// Invalidate single item
invalidate(thing.cacheKeys.get(123));
```

See [Cache Invalidation API](/api/resources#invalidation) for full details.

## Best Practices

### 1. Co-locate Resources with Types

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

Match resource names to REST endpoints:

```typescript
// WordPress Core REST: /wp/v2/posts
name: 'post';

// Custom REST: /wpk/v1/things
name: 'thing';
```

### 3. Define Granular Cache Keys

More specific keys = better invalidation control:

```typescript
// ❌ Too broad - invalidates ALL lists
cacheKeys: {
	list: () => ['thing', 'list'];
}

// ✅ Granular - invalidate by category/status
cacheKeys: {
	list: (q) => ['thing', 'list', q?.category, q?.status];
}
```

### 4. Always Type Your Queries

```typescript
// ✅ Typed - enforces query parameters
defineResource<Thing, ThingQuery>({ ... })

// ❌ Untyped - accepts any query
defineResource<Thing>({ ... })
```

### 5. Use Store Selectors, Not Direct Calls

```typescript
// ❌ Don't fetch directly in components
function MyComponent() {
	const [items, setItems] = useState([]);
	useEffect(() => {
		thing.list().then(setItems);
	}, []);
}

// ✅ Use store selectors (auto-caching, auto-loading)
function MyComponent() {
	const items = useSelect((select) => select(thing.store).getItems());
}
```

### 6. Check Loading State

```typescript
const { item, isLoading } = useSelect((select) => ({
	item: select(thing.store).getItem(id),
	isLoading: select(thing.store).isResolving('getItem', [id]),
}));
```

### 7. Invalidate After Writes

Always invalidate affected caches in your Actions:

```typescript
// In Actions layer
await thing.update(id, data);
invalidate(thing.cacheKeys.get(id));
invalidate(thing.cacheKeys.list({}));
```

## Advanced Patterns

### Partial Resource Definitions

You don't need all CRUD operations:

```typescript
// Read-only resource
const readOnlyThing = defineResource<Thing>({
	name: 'read-only-thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
	},
});

// Methods not defined are undefined
readOnlyThing.list(); // ✅ Available
readOnlyThing.get(1); // ✅ Available
readOnlyThing.create; // undefined
```

### Custom HTTP Methods

Use `PATCH` for partial updates:

```typescript
routes: {
	update: { path: '/wpk/v1/things/:id', method: 'PATCH' }
}
```

### Nested Resources

Define resources with multi-parameter paths. Pass parameters as an object matching the named placeholders:

```typescript
const comment = defineResource<Comment>({
	name: 'comment',
	routes: {
		list: { path: '/wpk/v1/things/:thingId/comments', method: 'GET' },
		get: { path: '/wpk/v1/things/:thingId/comments/:id', method: 'GET' },
	},
});

// Pass parameters as object with named keys
await comment.list({ thingId: 42 }); // → /wpk/v1/things/42/comments
await comment.get({ thingId: 42, id: 7 }); // → /wpk/v1/things/42/comments/7
```

### Custom Cache Strategy

```typescript
cacheKeys: {
	// Time-sensitive cache (1-minute buckets)
	list: (q) => ['thing', 'list', q?.q, Math.floor(Date.now() / 60000)],

	// Include user context
	get: (id) => ['thing', 'get', id, currentUserId],

	// Conditional keys based on query
	list: (q) => {
		const parts = ['thing', 'list'];
		if (q?.category) parts.push('cat', q.category);
		if (q?.status) parts.push('status', q.status);
		return parts;
	}
}
```

### Custom Store Configuration

For advanced use cases, create stores manually:

```typescript
import { createStore } from '@geekist/wp-kernel/resource';

const customStore = createStore({
	resource: thing,
	getId: (item) => `${item.type}-${item.id}`, // Custom ID function
	getQueryKey: (query) => `search-${query?.q}-page-${query?.page}`,
	initialState: { items: { 1: preloadedItem } },
});
```

## See Also

- [API Reference](/api/resources) - Complete API documentation
- [Actions Guide](/guide/actions) - Using resources in actions
- [Events Guide](/guide/events) - Resource-related events
- [Product Spec § 4.1](https://github.com/theGeekist/wp-kernel/blob/main/information/Product%20Specification%20PO%20Draft%20•%20v1.0.md#41-resources-model--client) - Design rationale
