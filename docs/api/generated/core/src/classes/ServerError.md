[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ServerError

# Class: ServerError

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

- [`WPKernelError`](WPKernelError.md)

## Constructors

### Constructor

```ts
new ServerError(options): ServerError;
```

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

`Record`\&lt;`string`, `unknown`\&gt;

###### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

#### Returns

`ServerError`

#### Overrides

[`WPKernelError`](WPKernelError.md).[`constructor`](WPKernelError.md#constructor)

## Properties

### serverCode

```ts
readonly serverCode: string;
```

WordPress error code (e.g., 'rest_forbidden', 'rest_invalid_param')

---

### serverMessage

```ts
readonly serverMessage: string;
```

WordPress error message

---

### status

```ts
readonly status: number;
```

HTTP status code

---

### path

```ts
readonly path: string;
```

Request path

---

### method

```ts
readonly method: string;
```

HTTP method

---

### serverData?

```ts
readonly optional serverData: Record<string, unknown>;
```

Additional server data

---

### code

```ts
readonly code: ErrorCode;
```

Error code - identifies the type of error

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`code`](WPKernelError.md#code)

---

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`data`](WPKernelError.md#data)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`context`](WPKernelError.md#context)

## Methods

### fromWordPressResponse()

```ts
static fromWordPressResponse(
   response,
   path,
   method,
   context?): ServerError;
```

Parse WordPress REST API error response into ServerError

#### Parameters

##### response

[`WordPressRESTError`](../namespaces/error/type-aliases/WordPressRESTError.md)

WordPress REST error response

##### path

`string`

Request path

##### method

`string`

HTTP method

##### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

Additional context

#### Returns

`ServerError`

New ServerError instance

---

### isPermissionError()

```ts
isPermissionError(): boolean;
```

Check if this is a permission/capability error

#### Returns

`boolean`

True if this is a permission error

---

### isValidationError()

```ts
isValidationError(): boolean;
```

Check if this is a validation error

#### Returns

`boolean`

True if this is a validation error

---

### isNotFoundError()

```ts
isNotFoundError(): boolean;
```

Check if this is a "not found" error

#### Returns

`boolean`

True if resource was not found

---

### getValidationErrors()

```ts
getValidationErrors(): object[];
```

Extract validation errors from server response

#### Returns

`object`[]

Array of validation errors if available

---

### toJSON()

```ts
toJSON(): SerializedError;
```

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`toJSON`](WPKernelError.md#tojson)

---

### fromJSON()

```ts
static fromJSON(serialized): WPKernelError;
```

Create WPKernelError from serialized format

#### Parameters

##### serialized

[`SerializedError`](../type-aliases/SerializedError.md)

Serialized error object

#### Returns

[`WPKernelError`](WPKernelError.md)

New WPKernelError instance

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`fromJSON`](WPKernelError.md#fromjson)

---

### isWPKernelError()

```ts
static isWPKernelError(error): error is WPKernelError;
```

Check if an error is a WPKernelError

#### Parameters

##### error

`unknown`

Error to check

#### Returns

`error is WPKernelError`

True if error is a WPKernelError

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`isWPKernelError`](WPKernelError.md#iswpkernelerror)

---

### wrap()

```ts
static wrap(
   error,
   code,
   context?): WPKernelError;
```

Wrap a native Error into a WPKernelError

#### Parameters

##### error

`Error`

Native error to wrap

##### code

[`ErrorCode`](../type-aliases/ErrorCode.md) = `'UnknownError'`

Error code to assign

##### context?

[`ErrorContext`](../type-aliases/ErrorContext.md)

Additional context

#### Returns

[`WPKernelError`](WPKernelError.md)

New WPKernelError wrapping the original

#### Inherited from

[`WPKernelError`](WPKernelError.md).[`wrap`](WPKernelError.md#wrap)
