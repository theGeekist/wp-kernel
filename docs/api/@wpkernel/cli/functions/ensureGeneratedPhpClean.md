[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ensureGeneratedPhpClean

# Function: ensureGeneratedPhpClean()

```ts
function ensureGeneratedPhpClean(options): Promise&lt;void&gt;;
```

Ensures that the generated PHP directory is clean (i.e., no uncommitted changes).

This function checks the Git status of the specified directory. If uncommitted
changes are found, it throws a `WPKernelError` unless the `yes` option is true.

## Parameters

### options

[`EnsureGeneratedPhpCleanOptions`](../interfaces/EnsureGeneratedPhpCleanOptions.md)

Options for the cleanliness check.

## Returns

`Promise`\&lt;`void`\&gt;

## Throws

`WPKernelError` if uncommitted changes are found and `yes` is false.
