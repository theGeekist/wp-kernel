[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / SchemaConfig

# Interface: SchemaConfig

Configuration for a registered schema file.

Describes a shared schema source and where generated TypeScript types should
be written. Mirrors the JSON Schema `schemaConfig` definition.

## Properties

### generated

```ts
generated: object;
```

#### types

```ts
types: string;
```

Relative path where WPKernel should write the generated TypeScript
types for this schema.

---

### path

```ts
path: string;
```

Relative path (from plugin root) to the source schema file
(for example, a JSON Schema or Zod schema).

---

### description?

```ts
optional description: string;
```

Human-readable description of what this schema models
(for example, "Public job listing API payload").
