[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / Reporter

# Type Alias: Reporter

```ts
type Reporter = object;
```

## Properties

### info()

```ts
info: (message, context?) => void;
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
warn: (message, context?) => void;
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
error: (message, context?) => void;
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
debug: (message, context?) => void;
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
child: (namespace) => Reporter;
```

#### Parameters

##### namespace

`string`

#### Returns

`Reporter`
