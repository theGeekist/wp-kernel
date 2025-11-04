[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / createIr

# Function: createIr()

```ts
function createIr(options, environment): Promise & lt;
IRv1 & gt;
```

Creates an Intermediate Representation (IR) from the given build options.

This function sets up a pipeline with core fragments and builders, then runs
the pipeline to generate the IR based on the provided configuration.

## Parameters

### options

[`BuildIrOptions`](../interfaces/BuildIrOptions.md)

Options for building the IR, including configuration and source paths.

### environment

[`CreateIrEnvironment`](../interfaces/CreateIrEnvironment.md) = `{}`

Optional environment settings for the IR creation process.

## Returns

`Promise`\&lt;[`IRv1`](../interfaces/IRv1.md)\&gt;

A promise that resolves to the generated `IRv1` object.
