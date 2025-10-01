[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [errors](../README.md) / TransportError

# Class: TransportError

Defined in: [errors/TransportError.ts:25](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L25)

Error thrown when a network/HTTP request fails

## Example

```typescript
throw new TransportError({
	status: 404,
	path: '/wpk/v1/things/123',
	method: 'GET',
	message: 'Resource not found',
});
```

## Extends

- [`KernelError`](KernelError.md)

## Constructors

### Constructor

```ts
new TransportError(options): TransportError;
```

Defined in: [errors/TransportError.ts:52](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L52)

Create a new TransportError

#### Parameters

##### options

Transport error options

###### status

`number`

###### path

`string`

###### method

`string`

###### message?

`string`

###### data?

[`ErrorData`](../interfaces/ErrorData.md)

###### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

#### Returns

`TransportError`

#### Overrides

[`KernelError`](KernelError.md).[`constructor`](KernelError.md#constructor)

## Properties

### code

```ts
readonly code: ErrorCode;
```

Defined in: [errors/KernelError.ts:32](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L32)

Error code - identifies the type of error

#### Inherited from

[`KernelError`](KernelError.md).[`code`](KernelError.md#code)

---

### data?

```ts
readonly optional data: ErrorData;
```

Defined in: [errors/KernelError.ts:37](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L37)

Additional data about the error

#### Inherited from

[`KernelError`](KernelError.md).[`data`](KernelError.md#data)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Defined in: [errors/KernelError.ts:42](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/KernelError.ts#L42)

Context in which the error occurred

#### Inherited from

[`KernelError`](KernelError.md).[`context`](KernelError.md#context)

---

### status

```ts
readonly status: number;
```

Defined in: [errors/TransportError.ts:29](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L29)

HTTP status code

---

### path

```ts
readonly path: string;
```

Defined in: [errors/TransportError.ts:34](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L34)

Request path

---

### method

```ts
readonly method: string;
```

Defined in: [errors/TransportError.ts:39](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L39)

HTTP method

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

#### Inherited from

[`KernelError`](KernelError.md).[`toJSON`](KernelError.md#tojson)

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

[`KernelError`](KernelError.md)

New KernelError instance

#### Inherited from

[`KernelError`](KernelError.md).[`fromJSON`](KernelError.md#fromjson)

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

#### Inherited from

[`KernelError`](KernelError.md).[`isKernelError`](KernelError.md#iskernelerror)

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

[`KernelError`](KernelError.md)

New KernelError wrapping the original

#### Inherited from

[`KernelError`](KernelError.md).[`wrap`](KernelError.md#wrap)

---

### isTimeout()

```ts
isTimeout(): boolean;
```

Defined in: [errors/TransportError.ts:112](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L112)

Check if error is a network timeout

#### Returns

`boolean`

True if this is a timeout error

---

### isRetryable()

```ts
isRetryable(): boolean;
```

Defined in: [errors/TransportError.ts:121](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L121)

Check if error is retryable

#### Returns

`boolean`

True if request should be retried

---

### isClientError()

```ts
isClientError(): boolean;
```

Defined in: [errors/TransportError.ts:138](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L138)

Check if error is a client error (4xx)

#### Returns

`boolean`

True if this is a client error

---

### isServerError()

```ts
isServerError(): boolean;
```

Defined in: [errors/TransportError.ts:147](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/TransportError.ts#L147)

Check if error is a server error (5xx)

#### Returns

`boolean`

True if this is a server error
