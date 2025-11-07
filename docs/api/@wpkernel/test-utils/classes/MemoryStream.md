[**@wpkernel/test-utils v0.12.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / MemoryStream

# Class: MemoryStream

A Writable stream that stores all written data in memory.

## Extends

- `Writable`

## Constructors

### Constructor

```ts
new MemoryStream(opts?): MemoryStream;
```

#### Parameters

##### opts?

`WritableOptions`\<`Writable`\>

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

`string` | `Buffer`\<`ArrayBufferLike`\>

##### \_encoding

`BufferEncoding`

##### callback

(`error?`) => `void`

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
