[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / PhpAstBuilder

# Interface: PhpAstBuilder

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

`PhpFileMetadata`
