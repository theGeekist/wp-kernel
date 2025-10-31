[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ActionConfig

# Type Alias: ActionConfig\&lt;TArgs, TResult\&gt;

```ts
type ActionConfig<TArgs, TResult> = object;
```

Configuration object accepted by `defineAction()`.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### handler

```ts
handler: ActionFn<TArgs, TResult>;
```

Implementation invoked when the action is executed.

---

### name

```ts
name: string;
```

Unique action identifier.

---

### options?

```ts
optional options: ActionOptions;
```

Optional runtime configuration.
