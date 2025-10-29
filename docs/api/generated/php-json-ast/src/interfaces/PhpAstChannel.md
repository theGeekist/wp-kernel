[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpAstChannel

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
