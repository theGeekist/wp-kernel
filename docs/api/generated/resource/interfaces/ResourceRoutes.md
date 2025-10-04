[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceRoutes

# Interface: ResourceRoutes

Defined in: [resource/types.ts:48](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L48)

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

Defined in: [resource/types.ts:50](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L50)

Fetch a list/collection of resources

---

### get?

```ts
optional get: ResourceRoute;
```

Defined in: [resource/types.ts:52](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L52)

Fetch a single resource by identifier

---

### create?

```ts
optional create: ResourceRoute;
```

Defined in: [resource/types.ts:54](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L54)

Create a new resource

---

### update?

```ts
optional update: ResourceRoute;
```

Defined in: [resource/types.ts:56](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L56)

Update an existing resource

---

### remove?

```ts
optional remove: ResourceRoute;
```

Defined in: [resource/types.ts:58](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L58)

Delete a resource
