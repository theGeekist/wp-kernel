[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpBuilderChannel

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
