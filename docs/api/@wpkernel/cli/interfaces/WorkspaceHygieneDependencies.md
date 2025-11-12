[**@wpkernel/cli v0.12.1-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / WorkspaceHygieneDependencies

# Interface: WorkspaceHygieneDependencies

## Properties

### Workspace

#### readGitStatus()

```ts
readonly readGitStatus: (workspace) => Promise<WorkspaceGitStatus | null>;
```

Reads the git status for the current workspace.

##### Parameters

###### workspace

[`Workspace`](Workspace.md)

Workspace instance to inspect.

##### Returns

`Promise`\<
[`WorkspaceGitStatus`](../interfaces/WorkspaceGitStatus.md) \| `null`
\>
