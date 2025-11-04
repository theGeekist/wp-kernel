[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineExtensionHookOptions

# Interface: PipelineExtensionHookOptions

Options passed to a pipeline extension hook.

## Properties

### context

```ts
readonly context: PipelineContext;
```

The current pipeline context.

---

### options

```ts
readonly options: BuildIrOptions;
```

Options for building the IR.

---

### artifact

```ts
readonly artifact: IRv1;
```

The finalized Intermediate Representation (IR).
