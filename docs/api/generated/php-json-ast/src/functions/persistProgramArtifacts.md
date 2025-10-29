[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / persistProgramArtifacts

# Function: persistProgramArtifacts()

```ts
function persistProgramArtifacts(
	context,
	output,
	filePath,
	code,
	ast
): Promise<void>;
```

## Parameters

### context

[`PipelineContext`](../interfaces/PipelineContext.md)

### output

[`BuilderOutput`](../interfaces/BuilderOutput.md)

### filePath

`string`

### code

`string`

### ast

[`PhpProgram`](../type-aliases/PhpProgram.md)

## Returns

`Promise`\&lt;`void`\&gt;
