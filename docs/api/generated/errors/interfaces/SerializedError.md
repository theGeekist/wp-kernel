[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [errors](../README.md) / SerializedError

# Interface: SerializedError

Defined in: [errors/types.ts:74](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L74)

Serialized error format (JSON-safe)

## Properties

### code

```ts
code: ErrorCode;
```

Defined in: [errors/types.ts:75](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L75)

---

### message

```ts
message: string;
```

Defined in: [errors/types.ts:76](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L76)

---

### data?

```ts
optional data: ErrorData;
```

Defined in: [errors/types.ts:77](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L77)

---

### context?

```ts
optional context: ErrorContext;
```

Defined in: [errors/types.ts:78](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L78)

---

### name

```ts
name: string;
```

Defined in: [errors/types.ts:79](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L79)

---

### stack?

```ts
optional stack: string;
```

Defined in: [errors/types.ts:80](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/types.ts#L80)
