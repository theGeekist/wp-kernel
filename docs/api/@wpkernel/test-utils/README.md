**@wpkernel/test-utils v0.12.1-beta.3**

---

# @wpkernel/test-utils v0.12.1-beta.3

## Classes

### CLI Helpers

- [MemoryStream](classes/MemoryStream.md)

## Interfaces

### WordPress Harness

- [ApiFetchHarness](interfaces/ApiFetchHarness.md)
- [ApiFetchHarnessOptions](interfaces/ApiFetchHarnessOptions.md)
- [WithWordPressDataOptions](interfaces/WithWordPressDataOptions.md)
- [WordPressHarnessOverrides](interfaces/WordPressHarnessOverrides.md)
- [WordPressTestHarness](interfaces/WordPressTestHarness.md)

### Action Runtime

- [ActionRuntimeOverrides](interfaces/ActionRuntimeOverrides.md)

### UI Harness

- [WPKernelUITestHarness](interfaces/WPKernelUITestHarness.md)
- [WPKernelUITestHarnessOptions](interfaces/WPKernelUITestHarnessOptions.md)

### CLI Helpers

- [ApplyLogEntry](interfaces/ApplyLogEntry.md)
- [ApplyLogFlags](interfaces/ApplyLogFlags.md)
- [ApplyLogRecord](interfaces/ApplyLogRecord.md)
- [ApplyLogSummary](interfaces/ApplyLogSummary.md)
- [BaseContext](interfaces/BaseContext.md)
- [BuildLoadedConfigOptions](interfaces/BuildLoadedConfigOptions.md)
- [CommandContextHarness](interfaces/CommandContextHarness.md)
- [CommandContextOptions](interfaces/CommandContextOptions.md)
- [FlushAsyncOptions](interfaces/FlushAsyncOptions.md)
- [ReporterMockOptions](interfaces/ReporterMockOptions.md)

### Integration

- [WorkspaceOptions](interfaces/WorkspaceOptions.md)

### Test Support

- [BuildCoreActionPipelineHarnessOptions](interfaces/BuildCoreActionPipelineHarnessOptions.md)
- [BuildCoreResourcePipelineHarnessOptions](interfaces/BuildCoreResourcePipelineHarnessOptions.md)
- [CoreActionPipelineHarness](interfaces/CoreActionPipelineHarness.md)
- [CoreResourcePipelineHarness](interfaces/CoreResourcePipelineHarness.md)
- [MemoryReporter](interfaces/MemoryReporter.md)
- [MemoryReporterEntry](interfaces/MemoryReporterEntry.md)
- [RuntimeOverrides](interfaces/RuntimeOverrides.md)

### Other

- [BuildNodeOptionsConfig](interfaces/BuildNodeOptionsConfig.md)
- [CommandReporterHarness](interfaces/CommandReporterHarness.md)
- [CommandWorkspaceHarness](interfaces/CommandWorkspaceHarness.md)
- [CommandWorkspaceHarnessOptions](interfaces/CommandWorkspaceHarnessOptions.md)
- [LoadedWPKConfigV1Like](interfaces/LoadedWPKConfigV1Like.md)
- [ResourceConfigLike](interfaces/ResourceConfigLike.md)
- [ResourceRegistryLike](interfaces/ResourceRegistryLike.md)
- [RunNodeProcessOptions](interfaces/RunNodeProcessOptions.md)
- [RunProcessOptions](interfaces/RunProcessOptions.md)
- [RunProcessResult](interfaces/RunProcessResult.md)
- [SchemaConfigLike](interfaces/SchemaConfigLike.md)
- [SchemaRegistryLike](interfaces/SchemaRegistryLike.md)
- [WordPressPackage](interfaces/WordPressPackage.md)
- [WPKConfigV1Like](interfaces/WPKConfigV1Like.md)

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

- [ReporterFactoryMock](type-aliases/ReporterFactoryMock.md)
- [WordPressData](type-aliases/WordPressData.md)

## Variables

### CLI Helpers

- [TMP_PREFIX](variables/TMP_PREFIX.md)

## Functions

### WordPress Harness

- [createApiFetchHarness](functions/createApiFetchHarness.md)
- [createWordPressTestHarness](functions/createWordPressTestHarness.md)
- [withWordPressData](functions/withWordPressData.md)

### Action Runtime

- [applyActionRuntimeOverrides](functions/applyActionRuntimeOverrides.md)
- [withActionRuntimeOverrides](functions/withActionRuntimeOverrides.md)

### UI Harness

- [createWPKernelUITestHarness](functions/createWPKernelUITestHarness.md)

### CLI Helpers

- [assignCommandContext](functions/assignCommandContext.md)
- [buildLoadedConfig](functions/buildLoadedConfig.md)
- [createCommandContext](functions/createCommandContext.md)
- [createMemoryStream](functions/createMemoryStream.md)
- [createReporterMock](functions/createReporterMock.md)
- [ensureDirectory](functions/ensureDirectory.md)
- [flushAsync](functions/flushAsync.md)
- [readApplyLogEntries](functions/readApplyLogEntries.md)
- [seedPlan](functions/seedPlan.md)
- [toFsPath](functions/toFsPath.md)

### Integration

- [buildPhpIntegrationEnv](functions/buildPhpIntegrationEnv.md)
- [createWorkspaceRunner](functions/createWorkspaceRunner.md)
- [withWorkspace](functions/withWorkspace.md)

### Test Support

- [buildCoreActionPipelineHarness](functions/buildCoreActionPipelineHarness.md)
- [buildCoreResourcePipelineHarness](functions/buildCoreResourcePipelineHarness.md)
- [createMemoryReporter](functions/createMemoryReporter.md)

### Other

- [buildCliIntegrationEnv](functions/buildCliIntegrationEnv.md)
- [buildNodeOptions](functions/buildNodeOptions.md)
- [clearNamespaceState](functions/clearNamespaceState.md)
- [createCommandReporterHarness](functions/createCommandReporterHarness.md)
- [createCommandWorkspaceHarness](functions/createCommandWorkspaceHarness.md)
- [createMockWpPackage](functions/createMockWpPackage.md)
- [createReporterFactory](functions/createReporterFactory.md)
- [ensureWpData](functions/ensureWpData.md)
- [runNodeProcess](functions/runNodeProcess.md)
- [runProcess](functions/runProcess.md)
- [sanitizePhpIntegrationEnv](functions/sanitizePhpIntegrationEnv.md)
- [setKernelPackage](functions/setKernelPackage.md)
- [setProcessEnv](functions/setProcessEnv.md)
- [setWpPluginData](functions/setWpPluginData.md)
