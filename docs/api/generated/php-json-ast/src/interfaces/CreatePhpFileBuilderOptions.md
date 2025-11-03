[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / CreatePhpFileBuilderOptions

# Interface: CreatePhpFileBuilderOptions\&lt;TContext, TInput, TOutput\&gt;

## Extends

- `Omit`\&lt;[`CreatePhpProgramBuilderOptions`](CreatePhpProgramBuilderOptions.md)\&lt;`TContext`, `TInput`, `TOutput`\&gt;, `"build"`\&gt;

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](PipelineContext.md) = [`PipelineContext`](PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](BuilderInput.md) = [`BuilderInput`](BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](BuilderOutput.md) = [`BuilderOutput`](BuilderOutput.md)

## Properties

### build()

```ts
readonly build: (builder, entry) => void | Promise<void>;
```

#### Parameters

##### builder

[`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

##### entry

[`PhpAstContextEntry`](PhpAstContextEntry.md)

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

[`CreateHelperOptions`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md).[`dependsOn`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md#dependson)

---

### filePath

```ts
readonly filePath: string;
```

#### Inherited from

```ts
Omit.filePath;
```

---

### key

```ts
readonly key: string;
```

#### Inherited from

```ts
Omit.key;
```

---

### metadata

```ts
readonly metadata: PhpFileMetadata;
```

#### Inherited from

```ts
Omit.metadata;
```

---

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

[`CreateHelperOptions`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md).[`mode`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md#mode)

---

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

```ts
Omit.namespace;
```

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`CreateHelperOptions`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md).[`origin`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md#origin)

---

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

[`CreateHelperOptions`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md).[`priority`](../../../@wpkernel/cli/interfaces/CreateHelperOptions.md#priority)
