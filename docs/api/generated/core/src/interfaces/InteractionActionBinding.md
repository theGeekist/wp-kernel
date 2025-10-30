[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / InteractionActionBinding

# Interface: InteractionActionBinding\&lt;TArgs, TResult\&gt;

Declarative binding describing an action exposed to the runtime.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### action

```ts
readonly action: DefinedAction<TArgs, TResult>;
```

---

### meta?

```ts
readonly optional meta:
  | Record<string, unknown>
| InteractionActionMetaResolver<TArgs>;
```
