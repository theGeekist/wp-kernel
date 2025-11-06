[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityCache

# Type Alias: CapabilityCache

```ts
type CapabilityCache = object;
```

Minimal cache contract used by the capability runtime and React hook.

## Properties

### get()

```ts
get: (key) => boolean | undefined;
```

#### Parameters

##### key

`string`

#### Returns

`boolean` \| `undefined`

---

### set()

```ts
set: (key, value, options?) => void;
```

#### Parameters

##### key

`string`

##### value

`boolean`

##### options?

###### ttlMs?

`number`

###### source?

`"local"` \| `"remote"`

###### expiresAt?

`number`

#### Returns

`void`

---

### invalidate()

```ts
invalidate: (capabilityKey?) => void;
```

#### Parameters

##### capabilityKey?

`string`

#### Returns

`void`

---

### clear()

```ts
clear: () => void;
```

#### Returns

`void`

---

### keys()

```ts
keys: () => string[];
```

#### Returns

`string`[]

---

### subscribe()

```ts
subscribe: (listener) => () => void;
```

#### Parameters

##### listener

() => `void`

#### Returns

```ts
(): void;
```

##### Returns

`void`

---

### getSnapshot()

```ts
getSnapshot: () => number;
```

#### Returns

`number`
