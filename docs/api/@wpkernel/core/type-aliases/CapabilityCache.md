[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / CapabilityCache

# Type Alias: CapabilityCache

```ts
type CapabilityCache = object;
```

Minimal cache contract used by the capability runtime and React hook.

## Properties

### get()

```ts
get: (key) =&gt; boolean | undefined;
```

#### Parameters

##### key

`string`

#### Returns

`boolean` \| `undefined`

***

### set()

```ts
set: (key, value, options?) =&gt; void;
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

***

### invalidate()

```ts
invalidate: (capabilityKey?) =&gt; void;
```

#### Parameters

##### capabilityKey?

`string`

#### Returns

`void`

***

### clear()

```ts
clear: () =&gt; void;
```

#### Returns

`void`

***

### keys()

```ts
keys: () =&gt; string[];
```

#### Returns

`string`[]

***

### subscribe()

```ts
subscribe: (listener) =&gt; () =&gt; void;
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

***

### getSnapshot()

```ts
getSnapshot: () =&gt; number;
```

#### Returns

`number`
