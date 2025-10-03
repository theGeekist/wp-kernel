[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceRoutes

# Interface: ResourceRoutes

Defined in: [resource/types.ts:47](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L47)

Standard CRUD routes for a resource

All routes are optional. At minimum, define the operations your resource supports.

## Example

```ts
{
  list: { path: '/my-plugin/v1/things', method: 'GET' },
  get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
  create: { path: '/my-plugin/v1/things', method: 'POST' },
  update: { path: '/my-plugin/v1/things/:id', method: 'PUT' },
  remove: { path: '/my-plugin/v1/things/:id', method: 'DELETE' }
}
```

## Properties

### list?

```ts
optional list: ResourceRoute;
```

Defined in: [resource/types.ts:49](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L49)

Fetch a list/collection of resources

---

### get?

```ts
optional get: ResourceRoute;
```

Defined in: [resource/types.ts:51](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L51)

Fetch a single resource by identifier

---

### create?

```ts
optional create: ResourceRoute;
```

Defined in: [resource/types.ts:53](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L53)

Create a new resource

---

### update?

```ts
optional update: ResourceRoute;
```

Defined in: [resource/types.ts:55](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L55)

Update an existing resource

---

### remove?

```ts
optional remove: ResourceRoute;
```

Defined in: [resource/types.ts:57](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L57)

Delete a resource
