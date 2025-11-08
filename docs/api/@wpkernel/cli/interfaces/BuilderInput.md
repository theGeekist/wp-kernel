[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuilderInput

# Interface: BuilderInput

Input for a builder helper.

## Extends

- `Omit`\<`BaseBuilderInput`, `"options"` \| `"ir"`\>

## Properties

### options

```ts
readonly options: BuildIrOptions;
```

Options for building the IR.

---

### ir

```ts
readonly ir: IRv1 | null;
```

The finalized Intermediate Representation (IR).

---

### phase

```ts
readonly phase: PipelinePhase;
```

#### Inherited from

```ts
Omit.phase;
```
