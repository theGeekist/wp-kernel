[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / DxEnvironment

# Interface: DxEnvironment

Environment metadata shared with readiness helpers.

## Properties

### cwd

```ts
readonly cwd: string;
```

Directory where the CLI process was invoked.

---

### projectRoot

```ts
readonly projectRoot: string;
```

Absolute path to the CLI package root.

---

### workspaceRoot

```ts
readonly workspaceRoot: string | null;
```

Resolved workspace root for the current command. `null` when the
command operates outside of a project workspace (for example, prior
to scaffolding).
