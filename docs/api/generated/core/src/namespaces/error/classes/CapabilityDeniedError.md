[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [error](../README.md) / CapabilityDeniedError

# Class: CapabilityDeniedError

Error thrown when a capability assertion fails

## Example

```typescript
throw new CapabilityDeniedError({
	namespace: 'my-plugin',
	capabilityKey: 'posts.edit',
	params: { postId: 123 },
	message: 'You do not have permission to edit this post',
});
```

## Extends

- [`WPKernelError`](../../../classes/WPKernelError.md)

## Constructors

### Constructor

```ts
new CapabilityDeniedError(options): CapabilityDeniedError;
```

Create a new CapabilityDeniedError

#### Parameters

##### options

Capability denied error options

###### capabilityKey

`string`

Capability key that was denied

###### context?

[`ErrorContext`](../../../type-aliases/ErrorContext.md)

Additional error context

###### data?

[`ErrorData`](../../../type-aliases/ErrorData.md)

Additional error data

###### message?

`string`

Optional custom error message

###### namespace

`string`

Plugin namespace

###### params?

`unknown`

Parameters passed to capability check

#### Returns

`CapabilityDeniedError`

#### Overrides

[`WPKernelError`](../../../classes/WPKernelError.md).[`constructor`](../../../classes/WPKernelError.md#constructor)

## Properties

### capabilityKey

```ts
readonly capabilityKey: string;
```

Capability key that was denied

---

### code

```ts
readonly code: ErrorCode;
```

Error code - identifies the type of error

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`code`](../../../classes/WPKernelError.md#code)

---

### context?

```ts
readonly optional context: ErrorContext;
```

Context in which the error occurred

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`context`](../../../classes/WPKernelError.md#context)

---

### data?

```ts
readonly optional data: ErrorData;
```

Additional data about the error

#### Inherited from

[`WPKernelError`](../../../classes/WPKernelError.md).[`data`](../../../classes/WPKernelError.md#data)

---

### messageKey

```ts
readonly messageKey: string;
```

I18n message key for user-facing error messages
Format: `capability.denied.{namespace}.{capabilityKey}`

---

### namespace

```ts
readonly namespace: string;
```

Plugin namespace

## Methods

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

[`WPKernelError`](../../../classes/WPKernelError.md).[`isWPKernelError`](../../../classes/WPKernelError.md#iswpkernelerror)

---

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
