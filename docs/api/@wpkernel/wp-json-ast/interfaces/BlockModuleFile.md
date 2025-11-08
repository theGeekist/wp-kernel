[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / BlockModuleFile

# Interface: BlockModuleFile\<TMetadata\>

## Type Parameters

### TMetadata

`TMetadata` _extends_
\| [`BlockManifestMetadata`](../type-aliases/BlockManifestMetadata.md)
\| [`BlockRegistrarMetadata`](../type-aliases/BlockRegistrarMetadata.md)

## Properties

### fileName

```ts
readonly fileName: string;
```

---

### namespace

```ts
readonly namespace: string | null;
```

---

### docblock

```ts
readonly docblock: readonly string[];
```

---

### metadata

```ts
readonly metadata: TMetadata;
```

---

### program

```ts
readonly program: PhpProgram;
```
