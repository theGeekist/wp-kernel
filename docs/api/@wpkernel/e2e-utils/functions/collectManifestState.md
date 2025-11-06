[**@wpkernel/e2e-utils v0.11.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / collectManifestState

# Function: collectManifestState()

```ts
function collectManifestState(workspace, definition): Promise & lt;
FileManifest & gt;
```

Collects the file system manifest state for comparison.

This utility captures the current state of files within a workspace,
which can then be compared against a previous state to detect changes.

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

### definition

[`ManifestStateDefinition`](../interfaces/ManifestStateDefinition.md)

## Returns

`Promise`\<[`FileManifest`](../interfaces/FileManifest.md)\>
