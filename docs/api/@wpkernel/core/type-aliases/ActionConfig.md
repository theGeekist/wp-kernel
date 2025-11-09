[**@wpkernel/core v0.12.1-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ActionConfig

# Type Alias: ActionConfig\<TArgs, TResult\>

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
