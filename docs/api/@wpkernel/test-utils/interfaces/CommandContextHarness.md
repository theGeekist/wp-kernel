[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CommandContextHarness

# Interface: CommandContextHarness

A harness containing the created command context and associated streams.

## Properties

### context

```ts
context: BaseContext;
```

The created command context.

---

### stderr

```ts
stderr: MemoryStream;
```

The `MemoryStream` for standard error.

---

### stdout

```ts
stdout: MemoryStream;
```

The `MemoryStream` for standard output.
