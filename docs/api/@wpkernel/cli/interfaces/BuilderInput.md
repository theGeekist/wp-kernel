[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / BuilderInput

# Interface: BuilderInput

Input for a builder helper.

## Extends

- `Omit`\&lt;`BaseBuilderInput`, `"options"` \| `"ir"`\&gt;

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
