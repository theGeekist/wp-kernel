# API Contracts Reference

WPKernel exports a small set of stable contracts. This page lists the event names, error classes, and cache key conventions that are guaranteed across releases.【F:packages/core/src/index.ts†L1-L120】

## Events registry

All framework events use the `wpk` namespace defined in `@wpkernel/core/namespace/constants`.【F:packages/core/src/namespace/constants.ts†L1-L120】

| Event constant                 | Value                   | Emitted when...                                                                                         |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `WPK_EVENTS.ACTION_START`      | `wpk.action.start`      | An action begins executing.【F:packages/core/src/actions/context.ts†L280-L320】                         |
| `WPK_EVENTS.ACTION_COMPLETE`   | `wpk.action.complete`   | An action finishes successfully.【F:packages/core/src/actions/context.ts†L280-L320】                    |
| `WPK_EVENTS.ACTION_ERROR`      | `wpk.action.error`      | An action throws an error.【F:packages/core/src/actions/context.ts†L280-L320】                          |
| `WPK_EVENTS.RESOURCE_REQUEST`  | `wpk.resource.request`  | A resource client issues an HTTP request.【F:packages/core/src/http/fetch.ts†L236-L275】                |
| `WPK_EVENTS.RESOURCE_RESPONSE` | `wpk.resource.response` | A resource client receives a successful response.【F:packages/core/src/http/fetch.ts†L236-L275】        |
| `WPK_EVENTS.RESOURCE_ERROR`    | `wpk.resource.error`    | A resource client receives an error response.【F:packages/core/src/http/fetch.ts†L236-L305】            |
| `WPK_EVENTS.CACHE_INVALIDATED` | `wpk.cache.invalidated` | Cache keys are invalidated via the resource runtime.【F:packages/core/src/resource/cache.ts†L720-L760】 |

Domain events emitted by resources use your plugin namespace. For a resource named `job` inside the `acme-jobs` namespace you receive:

```ts
job.events.created; // 'acme-jobs.job.created'
job.events.updated; // 'acme-jobs.job.updated'
job.events.removed; // 'acme-jobs.job.removed'
```

These values come directly from `defineResource` and match the namespace detection logic in the runtime.【F:packages/core/src/resource/define.ts†L360-L430】

## Error taxonomy

All framework errors extend `WPKernelError` and share the same serialization shape.【F:packages/core/src/error/WPKernelError.ts†L1-L160】

| Error class             | Description                              | Notable fields                           |
| ----------------------- | ---------------------------------------- | ---------------------------------------- |
| `WPKernelError`         | Base class for typed errors.             | `code`, `message`, `data`, `context`.    |
| `TransportError`        | Network or fetch failure in the browser. | `status`, `path`, `method`, `requestId`. |
| `ServerError`           | WordPress REST returned a `WP_Error`.    | `status`, `path`, `data`, `requestId`.   |
| `CapabilityDeniedError` | A capability assertion failed.           | `capabilityKey`, `context`, `userId?`.   |

Every error implements `toJSON()` so you can send it over the wire or store it in logs without losing type information.【F:packages/core/src/error/types.ts†L1-L120】

## Cache key patterns

Cache keys follow WordPress data store conventions: `[storeName, operation, ...params]`. Helpers from `@wpkernel/core/resource/cache` normalise and compare keys for you.【F:packages/core/src/resource/cache.ts†L1-L760】

Examples:

- `['job', 'list']` - unfiltered list cache key.
- `['job', 'list', 'open']` - filtered list cache key.
- `['job', 'get', 123]` - single item cache key.

Use `resource.cache.key()`, `resource.cache.invalidate.*`, and `matchesCacheKey()` to work with these patterns safely.【F:packages/core/src/resource/types.ts†L459-L620】【F:packages/core/src/resource/cache.ts†L400-L760】

## Namespaces and infrastructure

`@wpkernel/core/namespace/constants` exports additional constants used internally (capability cache channels, hooks namespaces, etc.). They are stable but generally only required when integrating deeply with the runtime.【F:packages/core/src/namespace/constants.ts†L1-L120】 When you need to listen for framework events in PHP, use `WPK_INFRASTRUCTURE.WP_HOOKS_NAMESPACE_PREFIX` to compose hook names instead of hardcoding strings.【F:packages/core/src/namespace/constants.ts†L25-L70】
