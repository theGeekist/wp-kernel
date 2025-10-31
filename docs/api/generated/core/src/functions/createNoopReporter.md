[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / createNoopReporter

# Function: createNoopReporter()

```ts
function createNoopReporter(): Reporter;
```

Create a reporter that silently ignores every log call.

Useful in production or tests where logging should be disabled without
altering calling code.

## Returns

[`Reporter`](../type-aliases/Reporter.md)

Reporter that performs no logging
