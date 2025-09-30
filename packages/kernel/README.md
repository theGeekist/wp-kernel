# @geekist/wp-kernel

> Rails-like framework for building modern WordPress products

## Overview

WP Kernel is a small, opinionated framework that standardizes how teams build WordPress plugins and themes in 2025+. It provides:

- **Actions-first architecture** - Write path orchestration
- **Resources** - Typed REST client with automatic caching
- **Events** - Canonical taxonomy with JS hooks + PHP bridge
- **Block Bindings** - Data-driven content without custom blocks
- **Interactivity API** - Front-end behavior without jQuery
- **Jobs** - Background work with polling support

## Installation

```bash
npm install @geekist/wp-kernel
# or
pnpm add @geekist/wp-kernel
```

## Quick Start

### Define a Resource

```typescript
import { defineResource } from '@geekist/wp-kernel/resource';

export const post = defineResource({
	name: 'post',
	routes: {
		list: { path: '/wp/v2/posts', method: 'GET' },
		get: { path: '/wp/v2/posts/:id', method: 'GET' },
		create: { path: '/wp/v2/posts', method: 'POST' },
		update: { path: '/wp/v2/posts/:id', method: 'PUT' },
	},
	cacheKeys: {
		list: (params) => ['post', 'list', params],
		get: (id) => ['post', id],
	},
});
```

### Create an Action

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { events } from '@geekist/wp-kernel/events';
import { post } from './resources/post';

export const CreatePost = defineAction('Post.Create', async ({ data }) => {
	const created = await post.create(data);

	// Emit canonical event
	CreatePost.emit(events.post.created, { id: created.id });

	// Invalidate cache
	invalidate(['post', 'list']);

	return created;
});
```

### Use in Block Editor

```typescript
import { CreatePost } from './actions/Post/Create';

const PostForm = () => {
	const handleSubmit = async (formData) => {
		await CreatePost({ data: formData });
	};

	return <form onSubmit={handleSubmit}>{/* ... */}</form>;
};
```

## Core Concepts

### Actions-First Rule

UI components **never** call transport directly. Always route writes through Actions.

```typescript
// ❌ WRONG
const handleClick = () => post.create(data);

// ✅ CORRECT
const handleClick = () => CreatePost({ data });
```

### Canonical Events

Use the event registry. Never create ad-hoc event names.

```typescript
import { events } from '@geekist/wp-kernel/events';

// Emit
action.emit(events.thing.created, payload);

// Listen
wp.hooks.addAction('wpk.thing.created', 'my-plugin', callback);
```

### Automatic Caching

Resources manage cache lifecycle automatically.

```typescript
// First call - fetches from server
const posts = await post.list();

// Second call - returns from cache
const samePosts = await post.list();

// After write - cache invalidated
await CreatePost({ data });
// Next list() will refetch
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

- **`@geekist/wp-kernel/resource`** - defineResource, resource client
- **`@geekist/wp-kernel/actions`** - defineAction, action orchestration
- **`@geekist/wp-kernel/events`** - Event registry, canonical names
- **`@geekist/wp-kernel/policies`** - definePolicy, capability checks
- **`@geekist/wp-kernel/jobs`** - defineJob, background work
- **`@geekist/wp-kernel/bindings`** - Block binding sources
- **`@geekist/wp-kernel/interactivity`** - defineInteraction, front-end actions
- **`@geekist/wp-kernel/errors`** - KernelError, error taxonomy

### Error Handling

```typescript
import { KernelError } from '@geekist/wp-kernel/errors';

try {
	await CreatePost({ data });
} catch (error) {
	if (error instanceof KernelError) {
		console.log(error.code); // 'PolicyDenied', 'ValidationError', etc.
		console.log(error.context);
	}
}
```

## Documentation

For complete documentation, see:

- [Product Specification](../../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md)
- [Code Primitives & Dev Tooling](../../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md)
- [Event Taxonomy Reference](../../information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

MIT © [The Geekist](https://github.com/theGeekist)
