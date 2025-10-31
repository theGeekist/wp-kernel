[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / WorkspaceOptions

# Interface: WorkspaceOptions

## Properties

### chdir?

```ts
optional chdir: boolean;
```

---

### files?

```ts
optional files: Record<string, string | Buffer<ArrayBufferLike>>;
```

---

### prefix?

```ts
optional prefix: string;
```

---

### setup()?

```ts
optional setup: (workspace) => void | Promise<void>;
```

#### Parameters

##### workspace

`string`

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

---

### teardown()?

```ts
optional teardown: (workspace) => void | Promise<void>;
```

#### Parameters

##### workspace

`string`

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;
