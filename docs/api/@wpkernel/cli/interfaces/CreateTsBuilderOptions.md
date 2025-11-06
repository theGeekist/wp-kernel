[**@wpkernel/cli v0.11.0**](../README.md)

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

### projectFactory()?

```ts
readonly optional projectFactory: () => Project;
```

Optional: A factory function to create a `ts-morph` Project instance.

#### Returns

`Project`

---

### hooks?

```ts
readonly optional hooks: TsBuilderLifecycleHooks;
```

Optional: Lifecycle hooks for the builder.
