[**@wpkernel/core v0.12.3-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceAdminUIConfig

# Interface: ResourceAdminUIConfig<TItem, TQuery>

Admin UI configuration for a resource.

Currently models the DataViews-based admin surface; additional admin
integrations can extend this shape over time.

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

### dataviews?

```ts
optional dataviews: ResourceDataViewsUIConfig<TItem, TQuery>;
```

DataViews configuration for this resource's admin screen.

---

### view?

```ts
optional view: string;
```

Selected admin view implementation. `'dataviews'` is the canonical value.
