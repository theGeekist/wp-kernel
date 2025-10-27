[**WP Kernel API v0.6.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [error](../README.md) / PolicyDeniedError

# Class: PolicyDeniedError

Error thrown when a policy assertion fails

## Example

```typescript
throw new PolicyDeniedError({
	namespace: 'my-plugin',
	policyKey: 'posts.edit',
	params: { postId: 123 },
	message: 'You do not have permission to edit this post',
});
```

## Extends

- [`WPKernelError`](../../../classes/WPKernelError.md)

## Constructors

### Constructor

```ts
new PolicyDeniedError(options): PolicyDeniedError;
```

Create a new PolicyDeniedError

#### Parameters

##### options

Policy denied error options

###### namespace

`string`

Plugin namespace

###### policyKey

`string`

Policy key that was denied

###### params?

`unknown`

Parameters passed to policy check

###### message?

`string`

Optional custom error message

###### data?

[`ErrorData`](../../../type-aliases/ErrorData.md)

Additional error data

###### context?

[`ErrorContext`](../../../type-aliases/ErrorContext.md)

Additional error context

#### Returns

`PolicyDeniedError`

#### Overrides

[`WPKernelError`](../../../classes/WPKernelError.md).[`constructor`](../../../classes/WPKernelError.md#constructor)

## Properties

### code

```ts
readonly code: ErrorCode;
```

Error code - identifies the type of error

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`code`](../../../classes/WPKernelError.md#code)

---

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`data`](../../../classes/WPKernelError.md#data)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`context`](../../../classes/WPKernelError.md#context)

---

### messageKey

```ts
readonly messageKey: string;
```

I18n message key for user-facing error messages
Format: `policy.denied.{namespace}.{policyKey}`

---

### policyKey

```ts
readonly policyKey: string;
```

Policy key that was denied

---

### namespace

```ts
readonly namespace: string;
```

Plugin namespace

## Methods

### toJSON()

```ts
toJSON(): SerializedError;
```

Serialize error to JSON-safe format

#### Returns

[`SerializedError`](../../../type-aliases/SerializedError.md)

Serialized error object

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`toJSON`](../../../classes/WPKernelError.md#tojson)

---

### fromJSON()

```ts
static fromJSON(serialized): WPKernelError;
```

Create WPKernelError from serialized format

#### Parameters

##### serialized

[`SerializedError`](../../../type-aliases/SerializedError.md)

Serialized error object

#### Returns

[`WPKernelError`](../../../classes/WPKernelError.md)

New WPKernelError instance

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`fromJSON`](../../../classes/WPKernelError.md#fromjson)

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

[`WPKernelError`](../../../classes/WPKernelError.md).[`isWPKernelError`](../../../classes/WPKernelError.md#iskernelerror)

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

[`ErrorCode`](../../../type-aliases/ErrorCode.md) = `'UnknownError'`

Error code to assign

##### context?

[`ErrorContext`](../../../type-aliases/ErrorContext.md)

Additional context

#### Returns

[`WPKernelError`](../../../classes/WPKernelError.md)

New WPKernelError wrapping the original

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`wrap`](../../../classes/WPKernelError.md#wrap)
