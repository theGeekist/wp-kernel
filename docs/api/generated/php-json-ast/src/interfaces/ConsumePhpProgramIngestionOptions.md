[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / ConsumePhpProgramIngestionOptions

# Interface: ConsumePhpProgramIngestionOptions

## Properties

### context

```ts
readonly context: PipelineContext;
```

---

### defaultMetadata?

```ts
readonly optional defaultMetadata: PhpFileMetadata;
```

---

### reporter?

```ts
readonly optional reporter: Reporter;
```

---

### resolveFilePath()?

```ts
readonly optional resolveFilePath: (message) => string;
```

#### Parameters

##### message

[`PhpProgramIngestionMessage`](PhpProgramIngestionMessage.md)

#### Returns

`string`

---

### source

```ts
readonly source: PhpProgramIngestionSource;
```
