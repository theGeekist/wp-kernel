# Resources

> **Status**: 🚧 This page will be expanded in Sprint 1+

Resources define your data contract. One definition gives you:

- Typed REST client
- Store with selectors
- Cache keys
- Events

## Quick Reference

```typescript
import { defineResource } from '@geekist/wp-kernel/resource';

export const thing = defineResource<Thing, { q?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/gk/v1/things', method: 'GET' },
		get: { path: '/gk/v1/things/:id', method: 'GET' },
		create: { path: '/gk/v1/things', method: 'POST' },
		update: { path: '/gk/v1/things/:id', method: 'PUT' },
		remove: { path: '/gk/v1/things/:id', method: 'DELETE' },
	},
	schema: import('../../contracts/thing.schema.json'),
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q],
		get: (id) => ['thing', 'get', id],
	},
});
```

## See Also

- [Quick Start](/getting-started/quick-start) - Build your first resource
- [API Reference](/api/resources) - Complete API docs (coming soon)
