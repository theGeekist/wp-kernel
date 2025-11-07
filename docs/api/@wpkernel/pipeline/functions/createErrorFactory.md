[**@wpkernel/pipeline v0.12.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / createErrorFactory

# Function: createErrorFactory()

```ts
function createErrorFactory(create): ErrorFactory;
```

Creates an error factory that wraps a custom error class.

## Parameters

### create

(`code`, `message`) => `Error`

## Returns

[`ErrorFactory`](../type-aliases/ErrorFactory.md)

An error factory function

## Example

```typescript
class WPKernelError extends Error {
	constructor(code: string, options: { message: string }) {
		super(options.message);
		this.name = code;
	}
}

const createError = createErrorFactory(
	(code, message) => new WPKernelError(code, { message })
);
```
