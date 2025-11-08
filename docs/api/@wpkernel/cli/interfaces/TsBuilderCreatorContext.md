[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / TsBuilderCreatorContext

# Interface: TsBuilderCreatorContext

Context provided to a `TsBuilderCreator` function.

## Properties

### project

```ts
readonly project: Project;
```

The `ts-morph` project instance for managing source files.

---

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

---

### descriptor

```ts
readonly descriptor: ResourceDescriptor;
```

The resource descriptor for which artifacts are being created.

---

### config

```ts
readonly config: WPKernelConfigV1;
```

The full WPKernel configuration.

---

### sourcePath

```ts
readonly sourcePath: string;
```

The source path of the configuration file.

---

### ir

```ts
readonly ir: IRv1;
```

The Intermediate Representation (IR) of the project.

---

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance for logging.

---

### emit()

```ts
readonly emit: (options) => Promise<void>;
```

A function to emit a generated TypeScript file.

#### Parameters

##### options

[`TsBuilderEmitOptions`](TsBuilderEmitOptions.md)

#### Returns

`Promise`\<`void`\>
