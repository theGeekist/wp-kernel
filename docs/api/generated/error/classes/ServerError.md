[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / ServerError

# Class: ServerError

Defined in: [error/ServerError.ts:51](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L51)

Error thrown when WordPress REST API returns an error

## Example

```typescript
throw new ServerError({
	serverCode: 'rest_forbidden',
	serverMessage: 'Sorry, you are not allowed to do that.',
	status: 403,
	path: '/wpk/v1/things',
	method: 'POST',
});
```

## Extends

- [`KernelError`](KernelError.md)

## Constructors

### Constructor

```ts
new ServerError(options): ServerError;
```

Defined in: [error/ServerError.ts:94](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L94)

Create a new ServerError

#### Parameters

##### options

Server error options

###### serverCode

`string`

###### serverMessage

`string`

###### status

`number`

###### path

`string`

###### method

`string`

###### serverData?

`Record`\<`string`, `unknown`\>

###### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

#### Returns

`ServerError`

#### Overrides

[`KernelError`](KernelError.md).[`constructor`](KernelError.md#constructor)

## Properties

### code

```ts
readonly code: ErrorCode;
```

Defined in: [error/KernelError.ts:32](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L32)

Error code - identifies the type of error

#### Inherited from

[`KernelError`](KernelError.md).[`code`](KernelError.md#code)

---

### data?

```ts
readonly optional data: ErrorData;
```

Defined in: [error/KernelError.ts:37](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L37)

Additional data about the error

#### Inherited from

[`KernelError`](KernelError.md).[`data`](KernelError.md#data)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Defined in: [error/KernelError.ts:42](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L42)

Context in which the error occurred

#### Inherited from

[`KernelError`](KernelError.md).[`context`](KernelError.md#context)

---

### serverCode

```ts
readonly serverCode: string;
```

Defined in: [error/ServerError.ts:55](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L55)

WordPress error code (e.g., 'rest_forbidden', 'rest_invalid_param')

---

### serverMessage

```ts
readonly serverMessage: string;
```

Defined in: [error/ServerError.ts:60](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L60)

WordPress error message

---

### status

```ts
readonly status: number;
```

Defined in: [error/ServerError.ts:65](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L65)

HTTP status code

---

### path

```ts
readonly path: string;
```

Defined in: [error/ServerError.ts:70](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L70)

Request path

---

### method

```ts
readonly method: string;
```

Defined in: [error/ServerError.ts:75](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L75)

HTTP method

---

### serverData?

```ts
readonly optional serverData: Record<string, unknown>;
```

Defined in: [error/ServerError.ts:80](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L80)

Additional server data

## Methods

### toJSON()

```ts
toJSON(): SerializedError;
```

Defined in: [error/KernelError.ts:84](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L84)

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

Defined in: [error/KernelError.ts:101](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L101)

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

Defined in: [error/KernelError.ts:144](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L144)

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

Defined in: [error/KernelError.ts:156](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/KernelError.ts#L156)

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

### fromWordPressResponse()

```ts
static fromWordPressResponse(
   response,
   path,
   method,
   context?): ServerError;
```

Defined in: [error/ServerError.ts:139](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L139)

Parse WordPress REST API error response into ServerError

#### Parameters

##### response

[`WordPressRESTError`](../interfaces/WordPressRESTError.md)

WordPress REST error response

##### path

`string`

Request path

##### method

`string`

HTTP method

##### context?

[`ErrorContext`](../interfaces/ErrorContext.md)

Additional context

#### Returns

`ServerError`

New ServerError instance

---

### isPermissionError()

```ts
isPermissionError(): boolean;
```

Defined in: [error/ServerError.ts:163](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L163)

Check if this is a permission/capability error

#### Returns

`boolean`

True if this is a permission error

---

### isValidationError()

```ts
isValidationError(): boolean;
```

Defined in: [error/ServerError.ts:179](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L179)

Check if this is a validation error

#### Returns

`boolean`

True if this is a validation error

---

### isNotFoundError()

```ts
isNotFoundError(): boolean;
```

Defined in: [error/ServerError.ts:192](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L192)

Check if this is a "not found" error

#### Returns

`boolean`

True if resource was not found

---

### getValidationErrors()

```ts
getValidationErrors(): object[];
```

Defined in: [error/ServerError.ts:205](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/ServerError.ts#L205)

Extract validation errors from server response

#### Returns

`object`[]

Array of validation errors if available
