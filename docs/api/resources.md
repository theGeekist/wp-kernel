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
