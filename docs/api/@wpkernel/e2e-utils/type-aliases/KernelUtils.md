[**@wpkernel/e2e-utils v0.11.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / KernelUtils

# Type Alias: KernelUtils

```ts
type KernelUtils = object;
```

Main kernel utilities object returned by factory

## Properties

### resource()

```ts
resource: &lt;T&gt;(config) => ResourceUtils&lt;T&gt;;
```

Create resource utilities for a given resource config

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### config

[`WPKernelResourceConfig`](WPKernelResourceConfig.md)

Resource configuration from defineResource

#### Returns

[`ResourceUtils`](ResourceUtils.md)\&lt;`T`\&gt;

Resource utilities with typed methods

---

### store()

```ts
store: &lt;T&gt;(storeKey) => StoreUtils&lt;T&gt;;
```

Create store utilities for a given store key

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### storeKey

`string`

WordPress data store key (e.g., 'wpk/job')

#### Returns

[`StoreUtils`](StoreUtils.md)\&lt;`T`\&gt;

Store utilities with typed methods

---

### events()

```ts
events: &lt;P&gt;(options?) => Promise&lt;EventRecorder&lt;P&gt;&gt;;
```

Create event recorder for capturing kernel events

#### Type Parameters

##### P

`P` = `unknown`

#### Parameters

##### options?

[`EventRecorderOptions`](EventRecorderOptions.md)

Optional configuration for event filtering

#### Returns

`Promise`\&lt;[`EventRecorder`](EventRecorder.md)\&lt;`P`\&gt;\&gt;

Event recorder with capture and query methods

---

### dataview()

```ts
dataview: (options) => DataViewHelper;
```

Interact with a DataView rendered via ResourceDataView.

#### Parameters

##### options

[`DataViewHelperOptions`](DataViewHelperOptions.md)

Selection options for the DataView wrapper.

#### Returns

[`DataViewHelper`](DataViewHelper.md)
