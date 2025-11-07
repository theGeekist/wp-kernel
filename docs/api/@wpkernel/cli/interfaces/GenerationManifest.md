[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / GenerationManifest

# Interface: GenerationManifest

Represents the manifest of generated files and resources.

## Properties

### version

```ts
readonly version: 1;
```

---

### resources

```ts
readonly resources: Record<string, GenerationManifestResourceEntry>;
```

---

### pluginLoader?

```ts
readonly optional pluginLoader: GenerationManifestFilePair;
```

---

### phpIndex?

```ts
readonly optional phpIndex: GenerationManifestFilePair;
```

---

### ui?

```ts
readonly optional ui: GenerationManifestUiState;
```
