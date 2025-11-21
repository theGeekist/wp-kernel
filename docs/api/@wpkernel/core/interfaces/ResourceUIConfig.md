[**@wpkernel/core v0.12.3-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceUIConfig

# Interface: ResourceUIConfig<TItem, TQuery>

Top-level UI metadata attached to a resource.

Feeds CLI generators and `@wpkernel/ui` so that admin surfaces, fixtures,
and interactivity bindings can be derived from a single source of truth.

## Type Parameters

### TItem

`TItem` = `unknown`

Entity shape used in admin views.

### TQuery

`TQuery` = `unknown`

Query shape used by admin list operations.

## Indexable

```ts
[key: string]: unknown
```

Additional fields reserved for future extensions.

## Properties

### admin?

```ts
optional admin: ResourceAdminUIConfig<TItem, TQuery>;
```

Admin-specific UI configuration (e.g. DataViews).
