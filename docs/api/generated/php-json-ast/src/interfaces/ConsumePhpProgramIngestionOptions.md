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

### source

```ts
readonly source: PhpProgramIngestionSource;
```

---

### reporter?

```ts
readonly optional reporter: Reporter;
```

---

### defaultMetadata?

```ts
readonly optional defaultMetadata: PhpFileMetadata;
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
