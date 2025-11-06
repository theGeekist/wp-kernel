[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / ensureGeneratedPhpClean

# Function: ensureGeneratedPhpClean()

```ts
function ensureGeneratedPhpClean(options): Promise<void>;
```

Ensures that the generated PHP directory is clean (i.e., no uncommitted changes).

This function checks the Git status of the specified directory. If uncommitted
changes are found, it throws a `WPKernelError` unless the `yes` option is true.

## Parameters

### options

[`EnsureGeneratedPhpCleanOptions`](../interfaces/EnsureGeneratedPhpCleanOptions.md)

Options for the cleanliness check.

## Returns

`Promise`\<`void`\>

## Throws

`WPKernelError` if uncommitted changes are found and `yes` is false.
