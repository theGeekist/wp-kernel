[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / ResourceRoutes

# Interface: ResourceRoutes

Defined in: [types.ts:47](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L47)

Standard CRUD routes for a resource

All routes are optional. At minimum, define the operations your resource supports.

## Example

```ts
{
  list: { path: '/wpk/v1/things', method: 'GET' },
  get: { path: '/wpk/v1/things/:id', method: 'GET' },
  create: { path: '/wpk/v1/things', method: 'POST' },
  update: { path: '/wpk/v1/things/:id', method: 'PUT' },
  remove: { path: '/wpk/v1/things/:id', method: 'DELETE' }
}
```

## Properties

### list?

```ts
optional list: ResourceRoute;
```

Defined in: [types.ts:49](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L49)

Fetch a list/collection of resources

---

### get?

```ts
optional get: ResourceRoute;
```

Defined in: [types.ts:51](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L51)

Fetch a single resource by identifier

---

### create?

```ts
optional create: ResourceRoute;
```

Defined in: [types.ts:53](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L53)

Create a new resource

---

### update?

```ts
optional update: ResourceRoute;
```

Defined in: [types.ts:55](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L55)

Update an existing resource

---

### remove?

```ts
optional remove: ResourceRoute;
```

Defined in: [types.ts:57](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L57)

Delete a resource
