[**WP Kernel API v0.4.0**](../../../README.md)

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

### name

```ts
name: string;
```

Unique action identifier.

---

### handler

```ts
handler: ActionFn<TArgs, TResult>;
```

Implementation invoked when the action is executed.

---

### options?

```ts
optional options: ActionOptions;
```

Optional runtime configuration.
