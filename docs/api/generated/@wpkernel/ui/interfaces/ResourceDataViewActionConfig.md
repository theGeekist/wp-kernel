[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewActionConfig

# Interface: ResourceDataViewActionConfig\&lt;TItem, TInput, TResult\&gt;

Action configuration for ResourceDataView.

## Type Parameters

### TItem

`TItem`

### TInput

`TInput`

### TResult

`TResult` = `unknown`

## Properties

### id

```ts
id: string;
```

Unique identifier, mirrored in events.

---

### action

```ts
action: DefinedAction<TInput, TResult>;
```

Action implementation to invoke.

---

### label

```ts
label: string | (items) => string;
```

Label shown in DataViews UI.

---

### supportsBulk?

```ts
optional supportsBulk: boolean;
```

Whether bulk selection is supported.

---

### isDestructive?

```ts
optional isDestructive: boolean;
```

Flag destructive styling.

---

### isPrimary?

```ts
optional isPrimary: boolean;
```

Flag primary styling.

---

### capability?

```ts
optional capability: string;
```

Capability key to gate rendering and execution.

---

### disabledWhenDenied?

```ts
optional disabledWhenDenied: boolean;
```

When true, render disabled instead of hiding on capability denial.

---

### getActionArgs()

```ts
getActionArgs: (context) => TInput;
```

Build action input payload from the current selection and items.

#### Parameters

##### context

###### selection

(`string` \| `number`)[]

###### items

`TItem`[]

#### Returns

`TInput`

---

### buildMeta()?

```ts
optional buildMeta: (context) => Record<string, unknown> | undefined;
```

Optional meta object included in action triggered events.

#### Parameters

##### context

###### selection

(`string` \| `number`)[]

###### items

`TItem`[]

#### Returns

`Record`\&lt;`string`, `unknown`\&gt; \| `undefined`

---

### invalidateOnSuccess()?

```ts
optional invalidateOnSuccess: (result, context) =>
  | false
  | CacheKeyPattern[];
```

Optional invalidate hook overriding the default behaviour.

#### Parameters

##### result

`TResult`

##### context

###### selection

(`string` \| `number`)[]

###### items

`TItem`[]

###### input

`TInput`

#### Returns

\| `false`
\| [`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md)[]
