[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / IRSchema

# Interface: IRSchema

Represents an Intermediate Representation (IR) for a schema.

## Properties

### key

```ts
key: string;
```

A unique key for the schema.

---

### sourcePath

```ts
sourcePath: string;
```

The source path of the schema definition.

---

### hash

```ts
hash: string;
```

A hash of the schema content for change detection.

---

### schema

```ts
schema: unknown;
```

The actual schema definition.

---

### provenance

```ts
provenance: SchemaProvenance;
```

The provenance of the schema (manual or auto-generated).

---

### generatedFrom?

```ts
optional generatedFrom: object;
```

Optional: Information about what the schema was generated from.

#### type

```ts
type: 'storage';
```

#### resource

```ts
resource: string;
```
