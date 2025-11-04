[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / EnsureGeneratedPhpCleanOptions

# Interface: EnsureGeneratedPhpCleanOptions

Options for the `ensureGeneratedPhpClean` function.

## Properties

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

---

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance for logging.

---

### yes

```ts
readonly yes: boolean;
```

Whether to skip the cleanliness check (e.g., when `--yes` is provided).

---

### directory?

```ts
readonly optional directory: string;
```

Optional: The directory to check for generated PHP files. Defaults to `.generated/php`.
