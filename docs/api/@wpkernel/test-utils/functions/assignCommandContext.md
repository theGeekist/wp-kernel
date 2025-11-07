[**@wpkernel/test-utils v0.12.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / assignCommandContext

# Function: assignCommandContext()

```ts
function assignCommandContext<T>(
	command,
	options
): CommandContextHarness & object;
```

Assigns a newly created command context to an existing command object.

## Type Parameters

### T

`T` _extends_ `object`

## Parameters

### command

`T`

The command object to assign the context to.

### options

[`CommandContextOptions`](../interfaces/CommandContextOptions.md) = `{}`

Options for configuring the new command context.

## Returns

[`CommandContextHarness`](../interfaces/CommandContextHarness.md) & `object`

A `CommandContextHarness` combined with the original command object.
