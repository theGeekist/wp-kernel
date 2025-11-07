[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / Workspace

# Interface: Workspace

Kernel-aware workspace contract used by CLI generators.

## Extends

- `WorkspaceLike`

## Properties

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

`Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

---

### readText()

```ts
readText: (file) => Promise<string | null>;
```

#### Parameters

##### file

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### write()

```ts
write: (file, data, options?) => Promise<void>;
```

#### Parameters

##### file

`string`

##### data

`string` | `Buffer`\<`ArrayBufferLike`\>

##### options?

`WorkspaceWriteOptions`

#### Returns

`Promise`\<`void`\>

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

`Promise`\<`void`\>

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

`Promise`\<`void`\>

---

### glob()

```ts
glob: (pattern) => Promise<string[]>;
```

#### Parameters

##### pattern

`string` | readonly `string`[]

#### Returns

`Promise`\<`string`[]\>

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

`Promise`\<`"conflict"` \| `"clean"`\>

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

`Promise`\<[`FileManifest`](FileManifest.md)\>

---

### rollback()

```ts
rollback: (label?) => Promise<FileManifest>;
```

#### Parameters

##### label?

`string`

#### Returns

`Promise`\<[`FileManifest`](FileManifest.md)\>

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

() => `Promise`\<`T`\>

#### Returns

`Promise`\<\{
`result`: `T`;
`manifest`: [`FileManifest`](FileManifest.md);
\}\>

---

### tmpDir()

```ts
tmpDir: (prefix?) => Promise<string>;
```

#### Parameters

##### prefix?

`string`

#### Returns

`Promise`\<`string`\>

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

### exists()

```ts
exists: (target) => Promise<boolean>;
```

#### Parameters

##### target

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

```ts
WorkspaceLike.exists;
```
