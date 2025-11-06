[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineContext

# Interface: PipelineContext

Context object passed through the entire pipeline execution.

## Extends

- `Omit`\<`BasePipelineContext`, `"workspace"`\>

## Properties

### workspace

```ts
readonly workspace: Workspace;
```

The current workspace information.

---

### generationState

```ts
readonly generationState: GenerationManifest;
```

The state of the code generation process.

---

### reporter

```ts
readonly reporter: Reporter;
```

#### Inherited from

```ts
Omit.reporter;
```

---

### phase

```ts
readonly phase: PipelinePhase;
```

#### Inherited from

```ts
Omit.phase;
```
