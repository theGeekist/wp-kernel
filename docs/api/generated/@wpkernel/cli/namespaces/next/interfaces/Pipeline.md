[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / Pipeline

# Interface: Pipeline

## Properties

### ir

```ts
readonly ir: object;
```

#### use()

```ts
use: (helper) => void;
```

##### Parameters

###### helper

[`FragmentHelper`](../type-aliases/FragmentHelper.md)

##### Returns

`void`

---

### builders

```ts
readonly builders: object;
```

#### use()

```ts
use: (helper) => void;
```

##### Parameters

###### helper

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

##### Returns

`void`

---

### extensions

```ts
readonly extensions: object;
```

#### use()

```ts
use: (extension) => unknown;
```

##### Parameters

###### extension

[`PipelineExtension`](PipelineExtension.md)

##### Returns

`unknown`

---

### use()

```ts
use: (helper) => void;
```

#### Parameters

##### helper

[`FragmentHelper`](../type-aliases/FragmentHelper.md) | [`BuilderHelper`](../type-aliases/BuilderHelper.md)

#### Returns

`void`

---

### run()

```ts
run: (options) => Promise<PipelineRunResult>;
```

#### Parameters

##### options

[`PipelineRunOptions`](PipelineRunOptions.md)

#### Returns

`Promise`\&lt;[`PipelineRunResult`](PipelineRunResult.md)\&gt;
