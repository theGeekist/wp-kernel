[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / EnsureCleanDirectoryOptions

# Interface: EnsureCleanDirectoryOptions

Options for the `ensureCleanDirectory` function.

## Properties

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

---

### directory

```ts
readonly directory: string;
```

The directory to ensure is clean.

---

### force?

```ts
readonly optional force: boolean;
```

Whether to force the cleanup, even if the directory is not empty.

---

### create?

```ts
readonly optional create: boolean;
```

Whether to create the directory if it doesn't exist.

---

### reporter?

```ts
readonly optional reporter: Reporter;
```

Optional: The reporter instance for logging.
