[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / EnsureGeneratedPhpCleanOptions

# Interface: EnsureGeneratedPhpCleanOptions

Options for the `ensureGeneratedPhpClean` function.

## Properties

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance for logging.

---

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

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
