[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / MemoryStream

# Class: MemoryStream

## Extends

- `Writable`

## Constructors

### Constructor

```ts
new MemoryStream(opts?): MemoryStream;
```

#### Parameters

##### opts?

`WritableOptions`\&lt;`Writable`\&gt;

#### Returns

`MemoryStream`

#### Inherited from

```ts
Writable.constructor;
```

## Methods

### \_write()

```ts
_write(
   chunk,
   _encoding,
   callback): void;
```

#### Parameters

##### chunk

`string` | `Buffer`\&lt;`ArrayBufferLike`\&gt;

##### \_encoding

`BufferEncoding`

##### callback

(`error?`) =&gt; `void`

#### Returns

`void`

#### Overrides

```ts
Writable._write;
```

---

### toString()

```ts
toString(): string;
```

Returns a string representation of an object.

#### Returns

`string`

---

### clear()

```ts
clear(): void;
```

#### Returns

`void`
