[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpAstBuilder

# Interface: PhpAstBuilder

## Extended by

- [`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

## Properties

### getNamespace()

```ts
getNamespace: () => string;
```

#### Returns

`string`

---

### setNamespace()

```ts
setNamespace: (namespace) => void;
```

#### Parameters

##### namespace

`string`

#### Returns

`void`

---

### addUse()

```ts
addUse: (statement) => void;
```

#### Parameters

##### statement

`string`

#### Returns

`void`

---

### appendDocblock()

```ts
appendDocblock: (line) => void;
```

#### Parameters

##### line

`string`

#### Returns

`void`

---

### appendStatement()

```ts
appendStatement: (statement) => void;
```

#### Parameters

##### statement

`string`

#### Returns

`void`

---

### appendProgramStatement()

```ts
appendProgramStatement: (statement) => void;
```

#### Parameters

##### statement

[`PhpStmt`](../type-aliases/PhpStmt.md)

#### Returns

`void`

---

### getStatements()

```ts
getStatements: () => readonly string[];
```

#### Returns

readonly `string`[]

---

### getMetadata()

```ts
getMetadata: () => PhpFileMetadata;
```

#### Returns

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

---

### setMetadata()

```ts
setMetadata: (metadata) => void;
```

#### Parameters

##### metadata

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Returns

`void`

---

### getProgramAst()

```ts
getProgramAst: () => PhpProgram;
```

#### Returns

[`PhpProgram`](../type-aliases/PhpProgram.md)
