# @wpkernel/core

> The core framework for JavaScript-first WordPress development with Rails-like conventions

## Overview

WPKernel is the foundation package that provides:

- **Actions-first architecture** - All writes flow through `defineAction()` orchestrators
- **Resource definitions** - Single `defineResource()` creates client + store + cache + events
- **Background jobs** - Define and queue async work with `defineJob()`
- **Event system** - Canonical taxonomy with PHP bridge for extensibility

Built on WordPress primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

> Contracts for lifecycle phases, namespaces, and exit codes live under `@wpkernel/core/contracts` so every package consumes the same source of truth.

## Quick Start

```bash
npm install @wpkernel/core
```

```typescript
import { defineResource, defineAction } from '@wpkernel/core';

// 1. Define your resource
const post = defineResource({
  name: 'post',
  routes: {
    list: { path: '/wp/v2/posts', method: 'GET' },
    create: { path: '/wp/v2/posts', method: 'POST' },
  },
});

// 2. Create actions for writes
const CreatePost = defineAction(
  'CreatePost',
  async ({ title, content }) => {
    return await post.create({ title, content });
  }
);

// 3. Use in components
import { ActionButton } from '@wpkernel/ui';
<ActionButton action={CreatePost}>Create Post</ActionButton>
```

## Peer dependencies

Install the WordPress runtime packages alongside `@wpkernel/core` so builds
never inline them. The framework currently targets:

- `@wordpress/api-fetch` `>=7.32.0`
- `@wordpress/data` `>=10.32.0`
- `@wordpress/element` `>=6.32.0`
- `@wordpress/hooks` `>=4.32.0`

Run `pnpm lint:peers` before committing to confirm every workspace is aligned
with the shared capability from `scripts/check-framework-peers.ts`.

## Testing Helpers

- `@wpkernel/test-utils/core` exposes the WordPress harness family
  (`createWordPressTestHarness()`, `withWordPressData()`,
  `createApiFetchHarness()`) plus `applyActionRuntimeOverrides()` and
  `withActionRuntimeOverrides()` so suites can mutate
  `__WP_KERNEL_ACTION_RUNTIME__` without leaking global state.
- `@wpkernel/test-utils/wp` still provides the base globals when you need to
  assert against the canonical harness directly.

## Key Patterns

**📖 [Complete Documentation →](../../docs/packages/core.md)**

### Resources

```typescript
// Complete CRUD with events and caching
const user = defineResource<User>({
	name: 'user',
	routes: {
		/* REST endpoints */
	},
	cacheKeys: {
		/* cache strategies */
	},
	events: {
		/* canonical events */
	},
});
```

#### Custom identifiers

Resources index items by `item.id` out of the box. When your API uses slugs or
UUIDs, declare a store strategy so the cache uses the correct identifier.

```ts
const article = defineResource<Article, ArticleQuery>({
	name: 'article',
	routes: {
		list: { path: '/my-plugin/v1/articles', method: 'GET' },
		get: { path: '/my-plugin/v1/articles/:slug', method: 'GET' },
	},
	store: {
		getId: (item) => item.slug, // string | number
		getQueryKey: (query) => `category:${query?.category ?? 'all'}`,
		initialState: {
			items: {},
		},
	},
});
```

- `getId` determines how list and single item caches are keyed. The reporter
  logs a warning if the function returns `undefined` or produces duplicates.
- `getQueryKey` keeps list queries stable for slugs, UUIDs, or composite keys.
- `initialState` lets you seed deterministic fixtures (handy for previews).
- Test utilities (`createResourceHelper`) automatically use `getId`, so slug
  resources work end-to-end.

See the [Resource Store Identifier Strategy
specification](https://github.com/thegeekiest/wp-kernel/blob/main/Resource%20Store%20Identifier%20Strategy%20-%20Specification.md)
for the full design rationale.

### Actions

```typescript
// Orchestrate writes with validation and events
const UpdateUser = defineAction('UpdateUser', async ({ id, data }) => {
	// validation, optimistic updates, events
	return await user.update(id, data);
});
```

### Jobs

```typescript
// Background processing with retries
const SendWelcomeEmail = defineJob({
	name: 'SendWelcomeEmail',
	async execute({ userId }) {
		// async work, error handling, retries
	},
});
```

## WordPress Integration

- **WordPress 6.7+** - Required (Script Modules API)
- **PHP Bridge** - Automatic REST endpoint and capability integration (Sprint 9)

**📚 [Integration Guide](https://wpkernel.dev/wp-kernel/guide/getting-started)**

## Import Patterns

Choose what fits your project:

```typescript
// Submodule imports (recommended - best tree-shaking)
import { defineResource } from '@wpkernel/core/resource';
import { fetch } from '@wpkernel/core/http';
import { WPKernelError } from '@wpkernel/core/error';

// Flat imports (convenience)
import { defineResource, fetch, WPKernelError } from '@wpkernel/core';
```

Both patterns work identically. Submodule imports provide better tree-shaking.

## Documentation

- **[Getting Started](https://wpkernel.dev/wp-kernel/getting-started/)** - Your first resource and action
- **[API Reference](https://wpkernel.dev/wp-kernel/api/)** - Complete API documentation
- **[Contracts Reference](https://wpkernel.dev/wp-kernel/reference/contracts)** - Events, errors, cache keys

## Requirements

- **WordPress**: 6.7+ (Script Modules API required)
- **Node.js**: 20+ LTS (development)
- **TypeScript**: Recommended for type safety

````

### Use in Block Editor

```typescript
import { CreatePost } from './actions/Post/Create';

const PostForm = () => {
	const handleSubmit = async (formData) => {
		await CreatePost({ data: formData });
	};

	return <form onSubmit={handleSubmit}>{/* ... */}</form>;
};
````

## Core Concepts

### Actions-First Rule

UI components **never** call transport directly. Always route writes through Actions.

```typescript
// ✗ WRONG
const handleClick = () => post.create(data);

// ✓ CORRECT
const handleClick = () => CreatePost({ data });
```

### Canonical Events

Use the event registry. Never create ad-hoc event names.

```typescript
import { events } from '@wpkernel/core/events';

// Emit
action.emit(events.thing.created, payload);

// Listen
wp.hooks.addAction('acme-plugin.thing.created', 'my-plugin', callback);
```

### Automatic Caching

Resources manage cache lifecycle automatically.

```typescript
// First call - fetches from server
const posts = await post.fetchList();

// Second call - returns from cache
const samePosts = await post.fetchList();

// After write - cache invalidated
await CreatePost({ data });
// Next fetchList() will refetch
```

## Architecture

```
┌─────────────────────────────────────────┐
│  UI (Blocks + Bindings + Interactivity) │
└────────────────┬────────────────────────┘
                 │ triggers
                 ▼
         ┌───────────────┐
         │    Actions    │ ◄─── Orchestrates writes
         └───────┬───────┘
                 │ calls
                 ▼
         ┌───────────────┐
         │   Resources   │ ◄─── REST client + cache
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  WordPress    │ ◄─── REST API + capabilities
         │   REST API    │
         └───────────────┘
```

## API Reference

### Core Modules

- **`@wpkernel/core/resource`** - defineResource, resource client
- **`@wpkernel/core/actions`** - defineAction, action orchestration
- **`@wpkernel/core/events`** - Event registry, canonical names
- **`@wpkernel/core/capabilities`** - defineCapability, capability checks
- **`@wpkernel/core/jobs`** - defineJob, background work
- **`@wpkernel/core/bindings`** - Block binding sources
- **`@wpkernel/core/interactivity`** - defineInteraction, front-end actions
- **`@wpkernel/core/error`** - WPKernelError, error taxonomy

### Error Handling

```typescript
import { WPKernelError } from '@wpkernel/core/error';

try {
	await CreatePost({ data });
} catch (error) {
	if (error instanceof WPKernelError) {
		console.log(error.code); // 'CapabilityDenied', 'ValidationError', etc.
		console.log(error.context);
	}
}
```

## Contributing

See the [main repository](https://github.com/wpkernel/wpkernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
