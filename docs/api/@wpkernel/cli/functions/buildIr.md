[**@wpkernel/cli v0.12.3-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / buildIr

# Function: buildIr()

```ts
function buildIr(options): Promise & lt;
IRv1 & gt;
```

Builds the Intermediate Representation (IR) for a WPKernel project.

This function orchestrates the process of collecting, validating, and transforming
project configurations and metadata into a structured IR that serves as a single
source of truth for code generation and other CLI operations.

## Parameters

### options

[`BuildIrOptions`](../interfaces/BuildIrOptions.md)

Options for building the IR, including the project configuration and source details.

## Returns

`Promise`<[`IRv1`](../interfaces/IRv1.md)>

A promise that resolves with the generated `IRv1` object.
