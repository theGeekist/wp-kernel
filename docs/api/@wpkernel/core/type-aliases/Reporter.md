[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / Reporter

# Type Alias: Reporter

```ts
type Reporter = object;
```

## Properties

### info()

```ts
info: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

---

### warn()

```ts
warn: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

---

### error()

```ts
error: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

---

### debug()

```ts
debug: (message, context?) =&gt; void;
```

#### Parameters

##### message

`string`

##### context?

`unknown`

#### Returns

`void`

---

### child()

```ts
child: (namespace) =&gt; Reporter;
```

#### Parameters

##### namespace

`string`

#### Returns

`Reporter`
