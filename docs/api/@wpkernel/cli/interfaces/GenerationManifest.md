[**@wpkernel/cli v0.12.3-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / GenerationManifest

# Interface: GenerationManifest

Represents the manifest of generated files and resources.

## Properties

### resources

```ts
readonly resources: Record<string, GenerationManifestResourceEntry>;
```

---

### version

```ts
readonly version: 1;
```

---

### phpIndex?

```ts
readonly optional phpIndex: GenerationManifestFilePair;
```

---

### pluginLoader?

```ts
readonly optional pluginLoader: GenerationManifestFilePair;
```

---

### ui?

```ts
readonly optional ui: GenerationManifestUiState;
```
