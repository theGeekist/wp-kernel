[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / InitCommandInstance

# Type Alias: InitCommandInstance

```ts
type InitCommandInstance = Command & object;
```

Represents an instance of the `init` command.

## Type Declaration

### force

```ts
force: boolean;
```

Whether to force overwrite existing files.

### verbose

```ts
verbose: boolean;
```

Whether to enable verbose logging.

### preferRegistryVersions

```ts
preferRegistryVersions: boolean;
```

Whether to prefer registry versions for dependencies.

### summary

```ts
summary: string | null;
```

A summary of the initialization process.

### manifest

```ts
manifest: FileManifest | null;
```

The manifest of files created or modified.

### dependencySource

```ts
dependencySource: string | null;
```

The source of dependencies used.

### name?

```ts
optional name: string;
```

The name of the project.

### template?

```ts
optional template: string;
```

The template to use for scaffolding.
