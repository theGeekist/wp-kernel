[**@wpkernel/e2e-utils v0.11.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / compareManifestStates

# Function: compareManifestStates()

```ts
function compareManifestStates(
	workspace,
	definition
): Promise<{
	before: FileManifest;
	after: FileManifest;
	diff: FileManifestDiff;
}>;
```

Collects the file system manifest state for comparison.

This utility captures the current state of files within a workspace,
which can then be compared against a previous state to detect changes.

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

### definition

[`ManifestComparisonDefinition`](../interfaces/ManifestComparisonDefinition.md)

## Returns

`Promise`\<\{
`before`: [`FileManifest`](../interfaces/FileManifest.md);
`after`: [`FileManifest`](../interfaces/FileManifest.md);
`diff`: [`FileManifestDiff`](../interfaces/FileManifestDiff.md);
\}\>
