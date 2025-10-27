[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / fetch

# Function: fetch()

```ts
function fetch<T>(request): Promise<TransportResponse<T>>;
```

Fetch data from WordPress REST API

Wraps @wordpress/api-fetch with:

- Automatic request ID generation
- Event emission for observability
- Error normalization
- \_fields parameter support

## Type Parameters

### T

`T` = `unknown`

Expected response data type

## Parameters

### request

[`TransportRequest`](../type-aliases/TransportRequest.md)

Request configuration

## Returns

`Promise`\&lt;[`TransportResponse`](../type-aliases/TransportResponse.md)\&lt;`T`\&gt;\&gt;

Promise resolving to response with data and metadata

## Throws

KernelError on request failure

## Example

```typescript
import { fetch } from '@wpkernel/core/http';

const response = await fetch<Thing>({
	path: '/my-plugin/v1/things/123',
	method: 'GET',
});

console.log(response.data); // Thing object
console.log(response.requestId); // 'req_1234567890_abc123'
```
