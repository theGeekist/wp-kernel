[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / IRBlock

# Interface: IRBlock

Represents an Intermediate Representation (IR) for a block.

## Properties

### id

```ts
id: string;
```

Stable identifier for the block entry.

---

### key

```ts
key: string;
```

A unique key for the block.

---

### directory

```ts
directory: string;
```

The directory where the block is defined.

---

### hasRender

```ts
hasRender: boolean;
```

Indicates if the block has a render function.

---

### manifestSource

```ts
manifestSource: string;
```

The source path of the block's manifest.

---

### hash

```ts
hash: IRHashProvenance;
```

Provenance hash for the discovered block.
