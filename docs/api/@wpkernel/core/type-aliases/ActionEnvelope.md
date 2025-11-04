[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ActionEnvelope

# Type Alias: ActionEnvelope\&lt;TArgs, TResult\&gt;

```ts
type ActionEnvelope&lt;TArgs, TResult&gt; = object;
```

Shape of the action envelope dispatched through Redux middleware.

Action envelopes wrap WP Kernel actions in a Redux-compatible format, carrying:

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
action: DefinedAction & lt;
(TArgs, TResult & gt);
```

#### args

```ts
args: TArgs;
```

---

### \_\_kernelAction

```ts
__kernelAction: true;
```

---

### meta?

```ts
optional meta: Record&lt;string, unknown&gt;;
```
