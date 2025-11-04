[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ApplyCommandInstance

# Type Alias: ApplyCommandInstance

```ts
type ApplyCommandInstance = Command & object;
```

Represents an instance of the Apply command.

## Type Declaration

### yes

```ts
yes: boolean;
```

### backup

```ts
backup: boolean;
```

### force

```ts
force: boolean;
```

### summary

```ts
summary: PatchManifestSummary | null;
```

### records

```ts
records: PatchRecord[];
```

### manifest

```ts
manifest: PatchManifest | null;
```

### cleanup?

```ts
optional cleanup: string[];
```
