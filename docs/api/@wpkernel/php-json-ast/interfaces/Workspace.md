[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / Workspace

# Interface: Workspace

## Properties

### root

```ts
readonly root: string;
```

---

### cwd()

```ts
cwd: () => string;
```

#### Returns

`string`

---

### resolve()

```ts
resolve: (...parts) => string;
```

#### Parameters

##### parts

...`string`[]

#### Returns

`string`

---

### write()

```ts
write: (file, contents, options?) => Promise&lt;void&gt;;
```

#### Parameters

##### file

`string`

##### contents

`string` | `Buffer`\&lt;`ArrayBufferLike`\&gt;

##### options?

[`WorkspaceWriteOptions`](WorkspaceWriteOptions.md)

#### Returns

`Promise`\&lt;`void`\&gt;

---

### exists()

```ts
exists: (target) => Promise & lt;
boolean & gt;
```

#### Parameters

##### target

`string`

#### Returns

`Promise`\&lt;`boolean`\&gt;
