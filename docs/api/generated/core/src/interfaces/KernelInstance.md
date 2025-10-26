[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / KernelInstance

# Interface: KernelInstance

## Properties

### getNamespace()

```ts
getNamespace: () => string;
```

#### Returns

`string`

---

### getReporter()

```ts
getReporter: () => Reporter;
```

#### Returns

[`Reporter`](../type-aliases/Reporter.md)

---

### invalidate()

```ts
invalidate: (patterns, options?) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../type-aliases/InvalidateOptions.md)

#### Returns

`void`

---

### emit()

```ts
emit: (eventName, payload) => void;
```

#### Parameters

##### eventName

`string`

##### payload

`unknown`

#### Returns

`void`

---

### teardown()

```ts
teardown: () => void;
```

#### Returns

`void`

---

### getRegistry()

```ts
getRegistry: () => KernelRegistry | undefined;
```

#### Returns

[`KernelRegistry`](../type-aliases/KernelRegistry.md) \| `undefined`

---

### hasUIRuntime()

```ts
hasUIRuntime: () => boolean;
```

#### Returns

`boolean`

---

### getUIRuntime()

```ts
getUIRuntime: () =>
  | KernelUIRuntime
  | undefined;
```

#### Returns

\| [`KernelUIRuntime`](../@wpkernel/core/data/interfaces/KernelUIRuntime.md)
\| `undefined`

---

### attachUIBindings()

```ts
attachUIBindings: (attach, options?) => KernelUIRuntime;
```

#### Parameters

##### attach

[`KernelUIAttach`](../type-aliases/KernelUIAttach.md)

##### options?

[`UIIntegrationOptions`](UIIntegrationOptions.md)

#### Returns

[`KernelUIRuntime`](../@wpkernel/core/data/interfaces/KernelUIRuntime.md)

---

### ui

```ts
ui: object;
```

#### isEnabled()

```ts
isEnabled: () => boolean;
```

##### Returns

`boolean`

#### options?

```ts
optional options: UIIntegrationOptions;
```

---

### events

```ts
events: KernelEventBus;
```

---

### defineResource()

```ts
defineResource: <T, TQuery>(config) => ResourceObject<T, TQuery>;
```

#### Type Parameters

##### T

`T` = `unknown`

##### TQuery

`TQuery` = `unknown`

#### Parameters

##### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)\&lt;`T`, `TQuery`\&gt;

#### Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)\&lt;`T`, `TQuery`\&gt;
