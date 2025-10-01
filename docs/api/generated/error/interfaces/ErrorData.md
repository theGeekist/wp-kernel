[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / ErrorData

# Interface: ErrorData

Defined in: [error/types.ts:51](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L51)

Data payload that can be attached to errors

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### originalError?

```ts
optional originalError: Error;
```

Defined in: [error/types.ts:53](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L53)

Original error if wrapping

---

### validationErrors?

```ts
optional validationErrors: object[];
```

Defined in: [error/types.ts:56](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L56)

Validation errors

#### field

```ts
field: string;
```

#### message

```ts
message: string;
```

#### code?

```ts
optional code: string;
```

---

### serverCode?

```ts
optional serverCode: string;
```

Defined in: [error/types.ts:63](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L63)

Server error details

---

### serverMessage?

```ts
optional serverMessage: string;
```

Defined in: [error/types.ts:64](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L64)

---

### serverData?

```ts
optional serverData: unknown;
```

Defined in: [error/types.ts:65](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L65)
