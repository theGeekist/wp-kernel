[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpAstChannel

# Interface: PhpAstChannel

## Properties

### open()

```ts
open: (options) =&gt; PhpAstContextEntry;
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
get: (key) =&gt; PhpAstContextEntry | undefined;
```

#### Parameters

##### key

`string`

#### Returns

[`PhpAstContextEntry`](PhpAstContextEntry.md) \| `undefined`

---

### entries()

```ts
entries: () =&gt; readonly PhpAstContextEntry[];
```

#### Returns

readonly [`PhpAstContextEntry`](PhpAstContextEntry.md)[]

---

### reset()

```ts
reset: () =&gt; void;
```

#### Returns

`void`
