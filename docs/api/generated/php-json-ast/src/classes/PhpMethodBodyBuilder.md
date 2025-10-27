[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpMethodBodyBuilder

# Class: PhpMethodBodyBuilder

## Constructors

### Constructor

```ts
new PhpMethodBodyBuilder(indentUnit, indentLevel): PhpMethodBodyBuilder;
```

#### Parameters

##### indentUnit

`string`

##### indentLevel

`number`

#### Returns

`PhpMethodBodyBuilder`

## Methods

### line()

```ts
line(content): void;
```

#### Parameters

##### content

`string` = `''`

#### Returns

`void`

---

### raw()

```ts
raw(content): void;
```

#### Parameters

##### content

`string`

#### Returns

`void`

---

### blank()

```ts
blank(): void;
```

#### Returns

`void`

---

### getIndentUnit()

```ts
getIndentUnit(): string;
```

#### Returns

`string`

---

### getIndentLevel()

```ts
getIndentLevel(): number;
```

#### Returns

`number`

---

### statement()

```ts
statement(printable, options): void;
```

#### Parameters

##### printable

[`PhpPrintable`](../interfaces/PhpPrintable.md)\&lt;[`PhpStmt`](../type-aliases/PhpStmt.md)\&gt;

##### options

###### applyIndent?

`boolean`

#### Returns

`void`

---

### statementNode()

```ts
statementNode(statement): void;
```

#### Parameters

##### statement

[`PhpStmt`](../type-aliases/PhpStmt.md)

#### Returns

`void`

---

### toLines()

```ts
toLines(): string[];
```

#### Returns

`string`[]

---

### toStatements()

```ts
toStatements(): PhpStmt[];
```

#### Returns

[`PhpStmt`](../type-aliases/PhpStmt.md)[]
