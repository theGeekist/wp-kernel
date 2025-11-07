[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / ConsumePhpProgramIngestionOptions

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
