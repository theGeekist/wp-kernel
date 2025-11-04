[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / GenerationManifest

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
readonly resources: Record&lt;string, GenerationManifestResourceEntry&gt;;
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
