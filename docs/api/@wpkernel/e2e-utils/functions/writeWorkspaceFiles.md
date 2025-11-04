[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / writeWorkspaceFiles

# Function: writeWorkspaceFiles()

```ts
function writeWorkspaceFiles(workspace, files): Promise&lt;void&gt;;
```

Creates a temporary, isolated workspace for E2E tests.

This utility sets up a clean directory for each test, ensuring that tests
do not interfere with each other's file system state.

## Parameters

### workspace

[`IsolatedWorkspace`](../interfaces/IsolatedWorkspace.md)

### files

[`WorkspaceFileTree`](../type-aliases/WorkspaceFileTree.md)

## Returns

`Promise`\&lt;`void`\&gt;
