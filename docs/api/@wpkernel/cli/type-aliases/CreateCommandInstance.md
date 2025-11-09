[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / CreateCommandInstance

# Type Alias: CreateCommandInstance

```ts
type CreateCommandInstance = Command & object;
```

Represents an instance of the `create` command.

## Type Declaration

### dependencySource

```ts
dependencySource: string | null;
```

The source of dependencies used.

### force

```ts
force: boolean;
```

Whether to force overwrite existing files.

### manifest

```ts
manifest: FileManifest | null;
```

The manifest of files created or modified.

### preferRegistryVersions

```ts
preferRegistryVersions: boolean;
```

Whether to prefer registry versions for dependencies.

### skipInstall

```ts
skipInstall: boolean;
```

Whether to skip dependency installation.

### summary

```ts
summary: string | null;
```

A summary of the creation process.

### verbose

```ts
verbose: boolean;
```

Whether to enable verbose logging.

### name?

```ts
optional name: string;
```

The name of the project.

### target?

```ts
optional target: string;
```

The target directory for the new project.

### template?

```ts
optional template: string;
```

The template to use for scaffolding.
