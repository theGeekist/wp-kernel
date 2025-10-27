[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / PolicyCache

# Type Alias: PolicyCache

```ts
type PolicyCache = object;
```

Minimal cache contract used by the policy runtime and React hook.

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
invalidate: (policyKey?) => void;
```

#### Parameters

##### policyKey?

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

() =&gt; `void`

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
