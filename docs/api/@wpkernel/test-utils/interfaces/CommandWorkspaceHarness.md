[**@wpkernel/test-utils v0.12.1-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CommandWorkspaceHarness

# Interface: CommandWorkspaceHarness\<TWorkspace\>

## Type Parameters

### TWorkspace

`TWorkspace` _extends_ `WorkspaceLike` = `WorkspaceLike`

## Properties

### files

```ts
readonly files: Map<string, Buffer<ArrayBufferLike>>;
```

---

### get()

```ts
readonly get: (file) => Buffer<ArrayBufferLike> | undefined;
```

#### Parameters

##### file

`string`

#### Returns

`Buffer`\<`ArrayBufferLike`\> \| `undefined`

---

### getText()

```ts
readonly getText: (file) => string | null;
```

#### Parameters

##### file

`string`

#### Returns

`string` \| `null`

---

### has()

```ts
readonly has: (file) => boolean;
```

#### Parameters

##### file

`string`

#### Returns

`boolean`

---

### resolve()

```ts
readonly resolve: (file) => string;
```

#### Parameters

##### file

`string`

#### Returns

`string`

---

### workspace

```ts
readonly workspace: TWorkspace;
```
