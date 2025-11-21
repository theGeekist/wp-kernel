[**@wpkernel/cli v0.12.3-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / CreateTsBuilderOptions

# Interface: CreateTsBuilderOptions

Options for creating a TypeScript builder.

## Properties

### creators?

```ts
readonly optional creators: readonly TsBuilderCreator[];
```

Optional: A list of `TsBuilderCreator` instances to use.

---

### hooks?

```ts
readonly optional hooks: TsBuilderLifecycleHooks;
```

Optional: Lifecycle hooks for the builder.

---

### projectFactory()?

```ts
readonly optional projectFactory: () => MaybePromise<Project>;
```

Optional: A factory function to create a `ts-morph` Project instance.

#### Returns

`MaybePromise`<`Project`>
