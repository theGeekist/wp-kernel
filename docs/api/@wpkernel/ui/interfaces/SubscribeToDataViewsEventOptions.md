[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / SubscribeToDataViewsEventOptions

# Interface: SubscribeToDataViewsEventOptions

## Properties

### reporter?

```ts
optional reporter: Reporter;
```

---

### wordpress?

```ts
optional wordpress: object;
```

#### namespace?

```ts
optional namespace: string;
```

Unique namespace for `@wordpress/hooks`.
If omitted, a unique namespace is generated per subscription using
WPK_INFRASTRUCTURE.WP_HOOKS_NAMESPACE_UI_DATAVIEWS as the base:
`${base}:${eventName}:${seq}`.

#### priority?

```ts
optional priority: number;
```
