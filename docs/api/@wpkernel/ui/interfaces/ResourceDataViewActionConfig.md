[**@wpkernel/ui v0.12.1-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewActionConfig

# Interface: ResourceDataViewActionConfig\<TItem, TInput, TResult\>

Action configuration for ResourceDataView.

## Type Parameters

### TItem

`TItem`

### TInput

`TInput`

### TResult

`TResult` = `unknown`

## Properties

### action

```ts
action: DefinedAction<TInput, TResult>;
```

Action implementation to invoke.

---

### getActionArgs()

```ts
getActionArgs: (context) => TInput;
```

Build action input payload from the current selection and items.

#### Parameters

##### context

###### items

`TItem`[]

###### selection

(`string` \| `number`)[]

#### Returns

`TInput`

---

### id

```ts
id: string;
```

Unique identifier, mirrored in events.

---

### label

```ts
label: string | (items) => string;
```

Label shown in DataViews UI.

---

### buildMeta()?

```ts
optional buildMeta: (context) => Record<string, unknown> | undefined;
```

Optional meta object included in action triggered events.

#### Parameters

##### context

###### items

`TItem`[]

###### selection

(`string` \| `number`)[]

#### Returns

`Record`\<`string`, `unknown`\> \| `undefined`

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

### invalidateOnSuccess()?

```ts
optional invalidateOnSuccess: (result, context) => false | CacheKeyPattern[];
```

Optional invalidate hook overriding the default behaviour.

#### Parameters

##### result

`TResult`

##### context

###### input

`TInput`

###### items

`TItem`[]

###### selection

(`string` \| `number`)[]

#### Returns

`false` \| `CacheKeyPattern`[]

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

### supportsBulk?

```ts
optional supportsBulk: boolean;
```

Whether bulk selection is supported.
