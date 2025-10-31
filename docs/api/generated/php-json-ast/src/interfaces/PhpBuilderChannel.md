[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpBuilderChannel

# Interface: PhpBuilderChannel

## Properties

### queue()

```ts
queue: (action) => void;
```

#### Parameters

##### action

[`PhpProgramAction`](PhpProgramAction.md)

#### Returns

`void`

---

### drain()

```ts
drain: () => readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]

---

### reset()

```ts
reset: () => void;
```

#### Returns

`void`

---

### pending()

```ts
pending: () => readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]
