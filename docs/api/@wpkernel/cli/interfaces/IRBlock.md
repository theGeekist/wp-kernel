[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / IRBlock

# Interface: IRBlock

Represents an Intermediate Representation (IR) for a block.

## Properties

### directory

```ts
directory: string;
```

The directory where the block is defined.

---

### hash

```ts
hash: IRHashProvenance;
```

Provenance hash for the discovered block.

---

### hasRender

```ts
hasRender: boolean;
```

Indicates if the block has a render function.

---

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

### manifestSource

```ts
manifestSource: string;
```

The source path of the block's manifest.
