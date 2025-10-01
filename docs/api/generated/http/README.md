[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / http

# http

Transport Module for WP Kernel

Provides HTTP transport layer wrapping @wordpress/api-fetch with:

- Request correlation via unique IDs
- Event emission for observability
- Error normalization to KernelError
- Query parameter and field filtering support

## Interfaces

- [TransportRequest](interfaces/TransportRequest.md)
- [TransportResponse](interfaces/TransportResponse.md)
- [ResourceRequestEvent](interfaces/ResourceRequestEvent.md)
- [ResourceResponseEvent](interfaces/ResourceResponseEvent.md)
- [ResourceErrorEvent](interfaces/ResourceErrorEvent.md)

## Type Aliases

- [HttpMethod](type-aliases/HttpMethod.md)

## Functions

- [fetch](functions/fetch.md)
