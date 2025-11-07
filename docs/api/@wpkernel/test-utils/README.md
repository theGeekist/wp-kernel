**@wpkernel/test-utils v0.12.0**

---

# @wpkernel/test-utils v0.12.0

## Classes

### CLI Helpers

- [MemoryStream](classes/MemoryStream.md)

## Interfaces

### WordPress Harness

- [WordPressHarnessOverrides](interfaces/WordPressHarnessOverrides.md)
- [WordPressTestHarness](interfaces/WordPressTestHarness.md)
- [WithWordPressDataOptions](interfaces/WithWordPressDataOptions.md)
- [ApiFetchHarnessOptions](interfaces/ApiFetchHarnessOptions.md)
- [ApiFetchHarness](interfaces/ApiFetchHarness.md)

### Action Runtime

- [ActionRuntimeOverrides](interfaces/ActionRuntimeOverrides.md)

### UI Harness

- [WPKernelUITestHarnessOptions](interfaces/WPKernelUITestHarnessOptions.md)
- [WPKernelUITestHarness](interfaces/WPKernelUITestHarness.md)

### CLI Helpers

- [BaseContext](interfaces/BaseContext.md)
- [CommandContextOptions](interfaces/CommandContextOptions.md)
- [CommandContextHarness](interfaces/CommandContextHarness.md)
- [FlushAsyncOptions](interfaces/FlushAsyncOptions.md)
- [ApplyLogFlags](interfaces/ApplyLogFlags.md)
- [ApplyLogSummary](interfaces/ApplyLogSummary.md)
- [ApplyLogRecord](interfaces/ApplyLogRecord.md)
- [ApplyLogEntry](interfaces/ApplyLogEntry.md)
- [BuildLoadedConfigOptions](interfaces/BuildLoadedConfigOptions.md)
- [ReporterMockOptions](interfaces/ReporterMockOptions.md)

### Integration

- [WorkspaceOptions](interfaces/WorkspaceOptions.md)

### Test Support

- [MemoryReporterEntry](interfaces/MemoryReporterEntry.md)
- [MemoryReporter](interfaces/MemoryReporter.md)
- [RuntimeOverrides](interfaces/RuntimeOverrides.md)
- [BuildCoreActionPipelineHarnessOptions](interfaces/BuildCoreActionPipelineHarnessOptions.md)
- [CoreActionPipelineHarness](interfaces/CoreActionPipelineHarness.md)
- [BuildCoreResourcePipelineHarnessOptions](interfaces/BuildCoreResourcePipelineHarnessOptions.md)
- [CoreResourcePipelineHarness](interfaces/CoreResourcePipelineHarness.md)

### Other

- [WordPressPackage](interfaces/WordPressPackage.md)
- [SchemaConfigLike](interfaces/SchemaConfigLike.md)
- [SchemaRegistryLike](interfaces/SchemaRegistryLike.md)
- [ResourceConfigLike](interfaces/ResourceConfigLike.md)
- [ResourceRegistryLike](interfaces/ResourceRegistryLike.md)
- [WPKConfigV1Like](interfaces/WPKConfigV1Like.md)
- [LoadedWPKConfigV1Like](interfaces/LoadedWPKConfigV1Like.md)

## Type Aliases

### Action Runtime

- [RuntimeCleanup](type-aliases/RuntimeCleanup.md)

### UI Harness

- [WPKernelUIProviderComponent](type-aliases/WPKernelUIProviderComponent.md)

### CLI Helpers

- [ApplyLogStatus](type-aliases/ApplyLogStatus.md)
- [ReporterLike](type-aliases/ReporterLike.md)
- [ReporterMock](type-aliases/ReporterMock.md)

### Other

- [WordPressData](type-aliases/WordPressData.md)

## Variables

### CLI Helpers

- [TMP_PREFIX](variables/TMP_PREFIX.md)

## Functions

### WordPress Harness

- [createWordPressTestHarness](functions/createWordPressTestHarness.md)
- [withWordPressData](functions/withWordPressData.md)
- [createApiFetchHarness](functions/createApiFetchHarness.md)

### Action Runtime

- [applyActionRuntimeOverrides](functions/applyActionRuntimeOverrides.md)
- [withActionRuntimeOverrides](functions/withActionRuntimeOverrides.md)

### UI Harness

- [createWPKernelUITestHarness](functions/createWPKernelUITestHarness.md)

### CLI Helpers

- [createMemoryStream](functions/createMemoryStream.md)
- [createCommandContext](functions/createCommandContext.md)
- [assignCommandContext](functions/assignCommandContext.md)
- [flushAsync](functions/flushAsync.md)
- [buildLoadedConfig](functions/buildLoadedConfig.md)
- [ensureDirectory](functions/ensureDirectory.md)
- [toFsPath](functions/toFsPath.md)
- [seedPlan](functions/seedPlan.md)
- [readApplyLogEntries](functions/readApplyLogEntries.md)
- [createReporterMock](functions/createReporterMock.md)

### Integration

- [withWorkspace](functions/withWorkspace.md)
- [createWorkspaceRunner](functions/createWorkspaceRunner.md)
- [buildPhpIntegrationEnv](functions/buildPhpIntegrationEnv.md)

### Test Support

- [createMemoryReporter](functions/createMemoryReporter.md)
- [buildCoreActionPipelineHarness](functions/buildCoreActionPipelineHarness.md)
- [buildCoreResourcePipelineHarness](functions/buildCoreResourcePipelineHarness.md)

### Other

- [ensureWpData](functions/ensureWpData.md)
- [createMockWpPackage](functions/createMockWpPackage.md)
- [setKernelPackage](functions/setKernelPackage.md)
- [setWpPluginData](functions/setWpPluginData.md)
- [setProcessEnv](functions/setProcessEnv.md)
- [clearNamespaceState](functions/clearNamespaceState.md)
