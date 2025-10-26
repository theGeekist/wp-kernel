[**WP Kernel API v0.5.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / Workspace

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

[`WriteOptions`](WriteOptions.md)

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

### threeWayMerge()

```ts
threeWayMerge: (file, base, current, incoming, options?) =>
	Promise<'clean' | 'conflict'>;
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

`Promise`\&lt;`"clean"` \| `"conflict"`\&gt;

---

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

### dryRun()

```ts
dryRun: <T>(fn) =>
	Promise<{
		result: T;
		manifest: FileManifest;
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
`result`: `T`;
`manifest`: [`FileManifest`](FileManifest.md);
\}\&gt;

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

### resolve()

```ts
resolve: (...parts) => string;
```

#### Parameters

##### parts

...`string`[]

#### Returns

`string`
