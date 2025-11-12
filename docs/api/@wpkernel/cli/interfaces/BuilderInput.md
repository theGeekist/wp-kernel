[**@wpkernel/cli v0.12.1-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / BuilderInput

# Interface: BuilderInput

Input for a builder helper.

## Extends

- `Omit`\<`BaseBuilderInput`, `"options"` \| `"ir"`\>

## Properties

### ir

```ts
readonly ir: IRv1 | null;
```

The finalized Intermediate Representation (IR).

---

### options

```ts
readonly options: BuildIrOptions;
```

Options for building the IR.

---

### phase

```ts
readonly phase: PipelinePhase;
```

#### Inherited from

```ts
Omit.phase;
```
