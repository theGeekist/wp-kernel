[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [actions](../README.md) / ActionEnvelope

# Type Alias: ActionEnvelope\&lt;TArgs, TResult\&gt;

```ts
type ActionEnvelope<TArgs, TResult> = object;
```

Shape of the action envelope dispatched through Redux middleware.

Action envelopes wrap kernel actions in a Redux-compatible format, carrying:

- The action function itself (`payload.action`)
- The arguments to invoke it with (`payload.args`)
- Optional metadata for middleware coordination (`meta`)
- A marker flag for runtime type checking (`__kernelAction`)

## Type Parameters

### TArgs

`TArgs`

Input type for the action

### TResult

`TResult`

Return type from the action

## Properties

### type

```ts
type: typeof EXECUTE_ACTION_TYPE;
```

---

### payload

```ts
payload: object;
```

#### action

```ts
action: DefinedAction<TArgs, TResult>;
```

#### args

```ts
args: TArgs;
```

---

### meta?

```ts
optional meta: Record<string, unknown>;
```

---

### \_\_kernelAction

```ts
__kernelAction: true;
```
