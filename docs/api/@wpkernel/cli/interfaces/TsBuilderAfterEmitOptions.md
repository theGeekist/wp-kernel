[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / TsBuilderAfterEmitOptions

# Interface: TsBuilderAfterEmitOptions

Options passed to the `onAfterEmit` lifecycle hook.

## Properties

### emitted

```ts
readonly emitted: readonly string[];
```

A list of file paths that were emitted.

---

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

The reporter instance.
