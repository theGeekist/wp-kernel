[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / Workspace

# Interface: Workspace

## Extends

- `WorkspaceLike`

## Properties

### begin()

```ts
begin: (label?) => void;
```

#### Parameters

##### label?

`string`

#### Returns

`void`

---

### commit()

```ts
commit: (label?) => Promise<FileManifest>;
```

#### Parameters

##### label?

`string`

#### Returns

`Promise`\&lt;[`FileManifest`](FileManifest.md)\&gt;

---

### cwd()

```ts
cwd: () => string;
```

#### Returns

`string`

---

### dryRun()

```ts
dryRun: <T>(fn) =>
	Promise<{
		manifest: FileManifest;
		result: T;
	}>;
```

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() =&gt; `Promise`\&lt;`T`\&gt;

#### Returns

`Promise`\&lt;\{
`manifest`: [`FileManifest`](FileManifest.md);
`result`: `T`;
\}\&gt;

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

#### Inherited from

```ts
WorkspaceLike.exists;
```

---

### glob()

```ts
glob: (pattern) => Promise<string[]>;
```

#### Parameters

##### pattern

`string` | readonly `string`[]

#### Returns

`Promise`\&lt;`string`[]\&gt;

---

### read()

```ts
read: (file) => Promise<Buffer<ArrayBufferLike> | null>;
```

#### Parameters

##### file

`string`

#### Returns

`Promise`\&lt;`Buffer`\&lt;`ArrayBufferLike`\&gt; \| `null`\&gt;

---

### readText()

```ts
readText: (file) => Promise<string | null>;
```

#### Parameters

##### file

`string`

#### Returns

`Promise`\&lt;`string` \| `null`\&gt;

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

#### Inherited from

```ts
WorkspaceLike.resolve;
```

---

### rm()

```ts
rm: (target, options?) => Promise<void>;
```

#### Parameters

##### target

`string`

##### options?

[`RemoveOptions`](RemoveOptions.md)

#### Returns

`Promise`\&lt;`void`\&gt;

---

### rollback()

```ts
rollback: (label?) => Promise<FileManifest>;
```

#### Parameters

##### label?

`string`

#### Returns

`Promise`\&lt;[`FileManifest`](FileManifest.md)\&gt;

---

### root

```ts
readonly root: string;
```

#### Inherited from

```ts
WorkspaceLike.root;
```

---

### threeWayMerge()

```ts
threeWayMerge: (file, base, current, incoming, options?) =>
	Promise<'conflict' | 'clean'>;
```

#### Parameters

##### file

`string`

##### base

`string`

##### current

`string`

##### incoming

`string`

##### options?

[`MergeOptions`](MergeOptions.md)

#### Returns

`Promise`\&lt;`"conflict"` \| `"clean"`\&gt;

---

### tmpDir()

```ts
tmpDir: (prefix?) => Promise<string>;
```

#### Parameters

##### prefix?

`string`

#### Returns

`Promise`\&lt;`string`\&gt;

---

### write()

```ts
write: (file, data, options?) => Promise<void>;
```

#### Parameters

##### file

`string`

##### data

`string` | `Buffer`\&lt;`ArrayBufferLike`\&gt;

##### options?

[`WorkspaceWriteOptions`](../../../../../php-json-ast/src/interfaces/WorkspaceWriteOptions.md)

#### Returns

`Promise`\&lt;`void`\&gt;

---

### writeJson()

```ts
writeJson: <T>(file, value, options?) => Promise<void>;
```

#### Type Parameters

##### T

`T`

#### Parameters

##### file

`string`

##### value

`T`

##### options?

[`WriteJsonOptions`](WriteJsonOptions.md)

#### Returns

`Promise`\&lt;`void`\&gt;
