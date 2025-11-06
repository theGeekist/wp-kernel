[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ProgramTargetFile

# Interface: ProgramTargetFile\<TMetadata\>

## Type Parameters

### TMetadata

`TMetadata` _extends_ `PhpFileMetadata` = `PhpFileMetadata`

## Properties

### fileName

```ts
readonly fileName: string;
```

---

### program

```ts
readonly program: PhpProgram;
```

---

### metadata

```ts
readonly metadata: TMetadata;
```

---

### docblock?

```ts
readonly optional docblock: readonly string[];
```

---

### uses?

```ts
readonly optional uses: readonly string[];
```

---

### statements?

```ts
readonly optional statements: readonly string[];
```
