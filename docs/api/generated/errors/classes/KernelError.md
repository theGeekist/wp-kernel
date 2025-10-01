[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [errors](../README.md) / KernelError

# Class: KernelError

Defined in: [errors/KernelError.ts:28](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L28)

Base error class for WP Kernel

## Example

```typescript
throw new KernelError('PolicyDenied', {
	message: 'User lacks required capability',
	context: { policyKey: 'things.manage', userId: 123 },
});
```

## Extends

- `Error`

## Extended by

- [`TransportError`](TransportError.md)
- [`ServerError`](ServerError.md)

## Constructors

### Constructor

```ts
new KernelError(code, options): KernelError;
```

Defined in: [errors/KernelError.ts:53](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L53)

Create a new KernelError

#### Parameters

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md)

Error code identifying the error type

##### options

Error options

###### message?

`string`

###### data?

[`ErrorData`](../interfaces/ErrorData.md)

###### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

#### Returns

`KernelError`

#### Overrides

```ts
Error.constructor;
```

## Properties

### code

```ts
readonly code: ErrorCode;
```

Defined in: [errors/KernelError.ts:32](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L32)

Error code - identifies the type of error

---

### data?

```ts
readonly optional data: ErrorData;
```

Defined in: [errors/KernelError.ts:37](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L37)

Additional data about the error

---

### context?

```ts
readonly optional context: ErrorContext;
```

Defined in: [errors/KernelError.ts:42](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L42)

Context in which the error occurred

## Methods

### toJSON()

```ts
toJSON(): SerializedError;
```

Defined in: [errors/KernelError.ts:84](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L84)

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../interfaces/SerializedError.md)

Serialized error object

---

### fromJSON()

```ts
static fromJSON(serialized): KernelError;
```

Defined in: [errors/KernelError.ts:101](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L101)

Create KernelError from serialized format

#### Parameters

##### serialized

[`SerializedError`](../interfaces/SerializedError.md)

Serialized error object

#### Returns

`KernelError`

New KernelError instance

---

### isKernelError()

```ts
static isKernelError(error): error is KernelError;
```

Defined in: [errors/KernelError.ts:144](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L144)

Check if an error is a KernelError

#### Parameters

##### error

`unknown`

Error to check

#### Returns

`error is KernelError`

True if error is a KernelError

---

### wrap()

```ts
static wrap(
   error,
   code,
   context?): KernelError;
```

Defined in: [errors/KernelError.ts:156](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L156)

Wrap a native Error into a KernelError

#### Parameters

##### error

`Error`

Native error to wrap

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md) = `'UnknownError'`

Error code to assign

##### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

Additional context

#### Returns

`KernelError`

New KernelError wrapping the original
