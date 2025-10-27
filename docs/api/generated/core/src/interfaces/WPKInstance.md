[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / WPKInstance

# Interface: WPKInstance

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
getRegistry: () => WPKernelRegistry | undefined;
```

#### Returns

[`WPKernelRegistry`](../type-aliases/WPKernelRegistry.md) \| `undefined`

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
  | WPKernelUIRuntime
  | undefined;
```

#### Returns

\| [`WPKernelUIRuntime`](../@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)
\| `undefined`

---

### attachUIBindings()

```ts
attachUIBindings: (attach, options?) => WPKernelUIRuntime;
```

#### Parameters

##### attach

[`WPKernelUIAttach`](../type-aliases/WPKernelUIAttach.md)

##### options?

[`UIIntegrationOptions`](UIIntegrationOptions.md)

#### Returns

[`WPKernelUIRuntime`](../@wpkernel/core/data/interfaces/WPKernelUIRuntime.md)

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
events: WPKernelEventBus;
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
