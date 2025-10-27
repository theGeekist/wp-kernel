[**WP Kernel API v0.6.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [core/src](../../README.md) / http

# http

Transport Module for WP Kernel

Provides HTTP transport layer wrapping @wordpress/api-fetch with:

- Request correlation via unique IDs
- Event emission for observability
- Error normalization to WPKernelError
- Query parameter and field filtering support

## References

### fetch

Re-exports [fetch](../../functions/fetch.md)

---

### HttpMethod

Re-exports [HttpMethod](../../type-aliases/HttpMethod.md)

---

### TransportRequest

Re-exports [TransportRequest](../../type-aliases/TransportRequest.md)

---

### TransportResponse

Re-exports [TransportResponse](../../type-aliases/TransportResponse.md)

---

### TransportMeta

Re-exports [TransportMeta](../../type-aliases/TransportMeta.md)

---

### ResourceRequestEvent

Re-exports [ResourceRequestEvent](../../type-aliases/ResourceRequestEvent.md)

---

### ResourceResponseEvent

Re-exports [ResourceResponseEvent](../../type-aliases/ResourceResponseEvent.md)

---

### ResourceErrorEvent

Re-exports [ResourceErrorEvent](../../type-aliases/ResourceErrorEvent.md)
