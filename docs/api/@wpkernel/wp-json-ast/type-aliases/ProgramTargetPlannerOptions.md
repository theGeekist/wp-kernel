[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ProgramTargetPlannerOptions

# Type Alias: ProgramTargetPlannerOptions\<TFile\>

```ts
type ProgramTargetPlannerOptions<TFile> = object;
```

## Type Parameters

### TFile

`TFile` _extends_ [`ProgramTargetFile`](../interfaces/ProgramTargetFile.md) = [`ProgramTargetFile`](../interfaces/ProgramTargetFile.md)

## Properties

### workspace

```ts
readonly workspace: PipelineContext["workspace"];
```

---

### outputDir

```ts
readonly outputDir: string;
```

---

### channel

```ts
readonly channel: PhpBuilderChannel;
```

---

### docblockPrefix?

```ts
readonly optional docblockPrefix: readonly string[];
```

---

### strategy?

```ts
readonly optional strategy: ProgramTargetPlannerStrategy<TFile>;
```
