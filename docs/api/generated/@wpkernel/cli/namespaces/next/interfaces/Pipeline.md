[**WP Kernel API v0.4.0**](../../../../../README.md)

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

`FragmentHelper`

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

`BuilderHelper`

##### Returns

`void`

---

### extensions

```ts
readonly extensions: object;
```

#### use()

```ts
use: (extension) => void | Promise<void>;
```

##### Parameters

###### extension

`PipelineExtension`

##### Returns

`void` \| `Promise`\&lt;`void`\&gt;

---

### use()

```ts
use: (helper) => void;
```

#### Parameters

##### helper

`FragmentHelper` | `BuilderHelper`

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
