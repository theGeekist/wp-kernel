[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / Workspace

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
write: (file, contents, options?) => Promise<void>;
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
exists: (target) => Promise<boolean>;
```

#### Parameters

##### target

`string`

#### Returns

`Promise`\&lt;`boolean`\&gt;
