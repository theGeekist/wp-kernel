[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / WPKInstance

# Interface: WPKInstance

## Properties

### getNamespace()

```ts
getNamespace: () =&gt; string;
```

#### Returns

`string`

---

### getReporter()

```ts
getReporter: () =&gt; Reporter;
```

#### Returns

[`Reporter`](../type-aliases/Reporter.md)

---

### invalidate()

```ts
invalidate: (patterns, options?) =&gt; void;
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
emit: (eventName, payload) =&gt; void;
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
teardown: () =&gt; void;
```

#### Returns

`void`

---

### getRegistry()

```ts
getRegistry: () =&gt; WPKernelRegistry | undefined;
```

#### Returns

[`WPKernelRegistry`](../type-aliases/WPKernelRegistry.md) \| `undefined`

---

### hasUIRuntime()

```ts
hasUIRuntime: () =&gt; boolean;
```

#### Returns

`boolean`

---

### getUIRuntime()

```ts
getUIRuntime: () =&gt; WPKernelUIRuntime | undefined;
```

#### Returns

[`WPKernelUIRuntime`](WPKernelUIRuntime.md) \| `undefined`

---

### attachUIBindings()

```ts
attachUIBindings: (attach, options?) =&gt; WPKernelUIRuntime;
```

#### Parameters

##### attach

[`WPKernelUIAttach`](../type-aliases/WPKernelUIAttach.md)

##### options?

[`UIIntegrationOptions`](UIIntegrationOptions.md)

#### Returns

[`WPKernelUIRuntime`](WPKernelUIRuntime.md)

---

### ui

```ts
ui: object;
```

#### isEnabled()

```ts
isEnabled: () =&gt; boolean;
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
defineResource: &lt;T, TQuery&gt;(config) =&gt; ResourceObject&lt;T, TQuery&gt;;
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
