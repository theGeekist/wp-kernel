[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpProgramIngestionMessage

# Interface: PhpProgramIngestionMessage

## Properties

### file

```ts
readonly file: string;
```

---

### program

```ts
readonly program: PhpProgram;
```

---

### metadata?

```ts
readonly optional metadata: PhpFileMetadata;
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

---

### codemod?

```ts
readonly optional codemod: PhpProgramCodemodResult;
```
