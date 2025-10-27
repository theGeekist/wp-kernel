[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpAstBuilderAdapter

# Interface: PhpAstBuilderAdapter

## Extends

- [`PhpAstBuilder`](PhpAstBuilder.md)

## Properties

### context

```ts
readonly context: PhpAstContext;
```

---

### getNamespace()

```ts
getNamespace: () => string;
```

#### Returns

`string`

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getNamespace`](PhpAstBuilder.md#getnamespace)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`setNamespace`](PhpAstBuilder.md#setnamespace)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`addUse`](PhpAstBuilder.md#adduse)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`appendDocblock`](PhpAstBuilder.md#appenddocblock)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`appendStatement`](PhpAstBuilder.md#appendstatement)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`appendProgramStatement`](PhpAstBuilder.md#appendprogramstatement)

---

### getStatements()

```ts
getStatements: () => readonly string[];
```

#### Returns

readonly `string`[]

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getStatements`](PhpAstBuilder.md#getstatements)

---

### getMetadata()

```ts
getMetadata: () => PhpFileMetadata;
```

#### Returns

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getMetadata`](PhpAstBuilder.md#getmetadata)

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

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`setMetadata`](PhpAstBuilder.md#setmetadata)

---

### getProgramAst()

```ts
getProgramAst: () => PhpProgram;
```

#### Returns

[`PhpProgram`](../type-aliases/PhpProgram.md)

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getProgramAst`](PhpAstBuilder.md#getprogramast)
