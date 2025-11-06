[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineExtensionHookOptions

# Interface: PipelineExtensionHookOptions

Options passed to a pipeline extension hook.

Re-export of [`PipelineExtensionHookOptions`](../../../@wpkernel/pipeline/interfaces/PipelineExtensionHookOptions.md) from `@wpkernel/pipeline` with the CLI runtime generics applied.

## Properties

### context

```ts
readonly context: PipelineContext;
```

The current pipeline context.

---

### options

```ts
readonly options: PipelineRunOptions;
```

Options provided to the pipeline run, including configuration metadata, namespace helpers, reporter wiring, and workspace context.

---

### artifact

```ts
readonly artifact: IRv1;
```

The finalized Intermediate Representation (IR).
