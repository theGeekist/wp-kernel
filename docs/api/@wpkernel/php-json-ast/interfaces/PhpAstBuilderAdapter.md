[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpAstBuilderAdapter

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
getNamespace: () =&gt; string;
```

#### Returns

`string`

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getNamespace`](PhpAstBuilder.md#getnamespace)

---

### setNamespace()

```ts
setNamespace: (namespace) =&gt; void;
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
addUse: (statement) =&gt; void;
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
appendDocblock: (line) =&gt; void;
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
appendStatement: (statement) =&gt; void;
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
appendProgramStatement: (statement) =&gt; void;
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
getStatements: () =&gt; readonly string[];
```

#### Returns

readonly `string`[]

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getStatements`](PhpAstBuilder.md#getstatements)

---

### getMetadata()

```ts
getMetadata: () =&gt; PhpFileMetadata;
```

#### Returns

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getMetadata`](PhpAstBuilder.md#getmetadata)

---

### setMetadata()

```ts
setMetadata: (metadata) =&gt; void;
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
getProgramAst: () =&gt; PhpProgram;
```

#### Returns

[`PhpProgram`](../type-aliases/PhpProgram.md)

#### Inherited from

[`PhpAstBuilder`](PhpAstBuilder.md).[`getProgramAst`](PhpAstBuilder.md#getprogramast)
