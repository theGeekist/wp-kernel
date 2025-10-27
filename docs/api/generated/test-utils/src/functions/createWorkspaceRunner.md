[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / createWorkspaceRunner

# Function: createWorkspaceRunner()

```ts
function createWorkspaceRunner(
	defaultOptions
): (run, overrides?) => Promise<void>;
```

## Parameters

### defaultOptions

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md) = `{}`

## Returns

```ts
(run, overrides?): Promise<void>;
```

### Parameters

#### run

(`workspace`) =&gt; `Promise`\&lt;`void`\&gt;

#### overrides?

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md)

### Returns

`Promise`\&lt;`void`\&gt;
