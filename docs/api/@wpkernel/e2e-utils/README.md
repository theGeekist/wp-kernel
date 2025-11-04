**WP Kernel API v0.11.0**

---

# WP Kernel API v0.11.0

## Interfaces

- [FileManifest](interfaces/FileManifest.md)
- [FileManifestDiff](interfaces/FileManifestDiff.md)
- [FileHashEntry](interfaces/FileHashEntry.md)
- [CliTranscript](interfaces/CliTranscript.md)
- [IsolatedWorkspace](interfaces/IsolatedWorkspace.md)
- [WorkspaceTools](interfaces/WorkspaceTools.md)
- [WorkspaceRunOptions](interfaces/WorkspaceRunOptions.md)
- [WithIsolatedWorkspaceOptions](interfaces/WithIsolatedWorkspaceOptions.md)
- [ManifestStateDefinition](interfaces/ManifestStateDefinition.md)
- [ManifestComparisonDefinition](interfaces/ManifestComparisonDefinition.md)
- [RunNodeSnippetOptions](interfaces/RunNodeSnippetOptions.md)

## Type Aliases

- [DataViewHelper](type-aliases/DataViewHelper.md)
- [DataViewHelperOptions](type-aliases/DataViewHelperOptions.md)
- [WordPressFixtures](type-aliases/WordPressFixtures.md)
- [ResourceConfig](type-aliases/ResourceConfig.md)
- [ResourceUtils](type-aliases/ResourceUtils.md)
- [StoreUtils](type-aliases/StoreUtils.md)
- [EventRecorderOptions](type-aliases/EventRecorderOptions.md)
- [CapturedEvent](type-aliases/CapturedEvent.md)
- [EventRecorder](type-aliases/EventRecorder.md)
- [KernelUtils](type-aliases/KernelUtils.md)
- [WPKernelResourceConfig](type-aliases/WPKernelResourceConfig.md)
- [WithWorkspaceCallback](type-aliases/WithWorkspaceCallback.md)
- [WorkspaceFileTree](type-aliases/WorkspaceFileTree.md)
- [ManifestFileDefinition](type-aliases/ManifestFileDefinition.md)
- [ManifestMutationDefinition](type-aliases/ManifestMutationDefinition.md)

## Variables

- [VERSION](variables/VERSION.md)
- [test](variables/test.md)

## Functions

### Integration

- [withWorkspace](functions/withWorkspace.md)
- [createWorkspaceRunner](functions/createWorkspaceRunner.md)

### E2E Testing

- [createKernelUtils](functions/createKernelUtils.md)
- [createDataViewHelper](functions/createDataViewHelper.md)
- [withIsolatedWorkspace](functions/withIsolatedWorkspace.md)
- [writeWorkspaceFiles](functions/writeWorkspaceFiles.md)
- [collectManifestState](functions/collectManifestState.md)
- [compareManifestStates](functions/compareManifestStates.md)
- [runNodeSnippet](functions/runNodeSnippet.md)
