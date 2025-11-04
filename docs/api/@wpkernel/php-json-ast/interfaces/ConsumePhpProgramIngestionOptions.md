[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ConsumePhpProgramIngestionOptions

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
readonly optional resolveFilePath: (message) =&gt; string;
```

#### Parameters

##### message

[`PhpProgramIngestionMessage`](PhpProgramIngestionMessage.md)

#### Returns

`string`
