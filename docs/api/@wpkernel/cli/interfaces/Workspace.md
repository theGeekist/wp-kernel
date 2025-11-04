[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / Workspace

# Interface: Workspace

## Extends

- `WorkspaceLike`

## Properties

### cwd()

```ts
cwd: () =&gt; string;
```

#### Returns

`string`

---

### read()

```ts
read: (file) =&gt; Promise&lt;Buffer&lt;ArrayBufferLike&gt; | null&gt;;
```

#### Parameters

##### file

`string`

#### Returns

`Promise`\&lt;`Buffer`\&lt;`ArrayBufferLike`\&gt; \| `null`\&gt;

---

### readText()

```ts
readText: (file) =&gt; Promise&lt;string | null&gt;;
```

#### Parameters

##### file

`string`

#### Returns

`Promise`\&lt;`string` \| `null`\&gt;

---

### write()

```ts
write: (file, data, options?) =&gt; Promise&lt;void&gt;;
```

#### Parameters

##### file

`string`

##### data

`string` | `Buffer`\&lt;`ArrayBufferLike`\&gt;

##### options?

`WorkspaceWriteOptions`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### writeJson()

```ts
writeJson: &lt;T&gt;(file, value, options?) =&gt; Promise&lt;void&gt;;
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

### rm()

```ts
rm: (target, options?) =&gt; Promise&lt;void&gt;;
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
glob: (pattern) =&gt; Promise&lt;string[]&gt;;
```

#### Parameters

##### pattern

`string` | readonly `string`[]

#### Returns

`Promise`\&lt;`string`[]\&gt;

---

### threeWayMerge()

```ts
threeWayMerge: (file, base, current, incoming, options?) =&gt; Promise&lt;"conflict" | "clean"&gt;;
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

### begin()

```ts
begin: (label?) =&gt; void;
```

#### Parameters

##### label?

`string`

#### Returns

`void`

---

### commit()

```ts
commit: (label?) =&gt; Promise&lt;FileManifest&gt;;
```

#### Parameters

##### label?

`string`

#### Returns

`Promise`\&lt;[`FileManifest`](FileManifest.md)\&gt;

---

### rollback()

```ts
rollback: (label?) =&gt; Promise&lt;FileManifest&gt;;
```

#### Parameters

##### label?

`string`

#### Returns

`Promise`\&lt;[`FileManifest`](FileManifest.md)\&gt;

---

### dryRun()

```ts
dryRun: &lt;T&gt;(fn) =&gt; Promise&lt;{
  result: T;
  manifest: FileManifest;
}&gt;;
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
tmpDir: (prefix?) =&gt; Promise&lt;string&gt;;
```

#### Parameters

##### prefix?

`string`

#### Returns

`Promise`\&lt;`string`\&gt;

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
resolve: (...parts) =&gt; string;
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
exists: (target) =&gt; Promise&lt;boolean&gt;;
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
