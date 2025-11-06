[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpAstChannel

# Interface: PhpAstChannel

## Properties

### open()

```ts
open: (options) => PhpAstContextEntry;
```

#### Parameters

##### options

###### key

`string`

###### filePath

`string`

###### namespace

`string`

###### metadata

[`PhpFileMetadata`](../type-aliases/PhpFileMetadata.md)

#### Returns

[`PhpAstContextEntry`](PhpAstContextEntry.md)

---

### get()

```ts
get: (key) => PhpAstContextEntry | undefined;
```

#### Parameters

##### key

`string`

#### Returns

[`PhpAstContextEntry`](PhpAstContextEntry.md) \| `undefined`

---

### entries()

```ts
entries: () => readonly PhpAstContextEntry[];
```

#### Returns

readonly [`PhpAstContextEntry`](PhpAstContextEntry.md)[]

---

### reset()

```ts
reset: () => void;
```

#### Returns

`void`
