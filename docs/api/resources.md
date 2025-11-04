# Resources API

Complete API reference for the Resources module.

## Overview

Resources are the foundation of WP Kernel. They define typed REST endpoints with automatic:

- Client method generation
- Store registration (@wordpress/data)
- Cache key management
- Event emission
- Reporter instrumentation (debug/info/error)

## Quick Example

```typescript
import { defineResource } from '@wpkernel/core';

interface Thing {
	id: number;
	title: string;
	status: 'active' | 'inactive';
}

export const thing = defineResource<Thing, { status?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
	},
	schema: import('../../contracts/thing.schema.json'),
	cacheKeys: {
		list: (query) => ['thing', 'list', query?.status],
		get: (id) => ['thing', 'get', id],
	},
});

// Use the client
const things = await thing.fetchList({ status: 'active' });
const single = await thing.fetch(123);

// Reporter access
thing.reporter.debug('Fetched Thing list from settings panel');
```

## Full API Reference

For complete type signatures and all exported functions, see the [auto-generated API documentation](/api/@wpkernel/core/README#resource).

## Learn More

- [Resources Guide](/guide/resources) - Complete tutorial with examples
- [Quick Start](/getting-started/quick-start) - Get up and running fast
