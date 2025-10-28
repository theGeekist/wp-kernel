[**WP Kernel API v0.8.0**](../../README.md)

---

[WP Kernel API](../../README.md) / test-utils/src

# test-utils/src

## Classes

- [MemoryStream](classes/MemoryStream.md)

## Interfaces

- [BaseContext](interfaces/BaseContext.md)
- [CommandContextOptions](interfaces/CommandContextOptions.md)
- [CommandContextHarness](interfaces/CommandContextHarness.md)
- [ApplyLogFlags](interfaces/ApplyLogFlags.md)
- [ApplyLogSummary](interfaces/ApplyLogSummary.md)
- [ApplyLogRecord](interfaces/ApplyLogRecord.md)
- [ApplyLogEntry](interfaces/ApplyLogEntry.md)
- [FlushAsyncOptions](interfaces/FlushAsyncOptions.md)
- [ActionRuntimeOverrides](interfaces/ActionRuntimeOverrides.md)
- [WordPressHarnessOverrides](interfaces/WordPressHarnessOverrides.md)
- [WordPressTestHarness](interfaces/WordPressTestHarness.md)
- [WithWordPressDataOptions](interfaces/WithWordPressDataOptions.md)
- [ApiFetchHarnessOptions](interfaces/ApiFetchHarnessOptions.md)
- [ApiFetchHarness](interfaces/ApiFetchHarness.md)
- [WorkspaceOptions](interfaces/WorkspaceOptions.md)
- [ReporterMockOptions](interfaces/ReporterMockOptions.md)
- [KernelUITestHarnessOptions](interfaces/KernelUITestHarnessOptions.md)
- [KernelUITestHarness](interfaces/KernelUITestHarness.md)
- [WordPressPackage](interfaces/WordPressPackage.md)

## Type Aliases

- [ApplyLogStatus](type-aliases/ApplyLogStatus.md)
- [RuntimeCleanup](type-aliases/RuntimeCleanup.md)
- [ReporterLike](type-aliases/ReporterLike.md)
- [ReporterMock](type-aliases/ReporterMock.md)
- [WordPressData](type-aliases/WordPressData.md)

## Variables

- [TMP_PREFIX](variables/TMP_PREFIX.md)

## Functions

- [createCommandContext](functions/createCommandContext.md)
- [assignCommandContext](functions/assignCommandContext.md)
- [buildLoadedConfig](functions/buildLoadedConfig.md)
- [ensureDirectory](functions/ensureDirectory.md)
- [toFsPath](functions/toFsPath.md)
- [seedPlan](functions/seedPlan.md)
- [readApplyLogEntries](functions/readApplyLogEntries.md)
- [flushAsync](functions/flushAsync.md)
- [createMemoryStream](functions/createMemoryStream.md)
- [applyActionRuntimeOverrides](functions/applyActionRuntimeOverrides.md)
- [withActionRuntimeOverrides](functions/withActionRuntimeOverrides.md)
- [createWordPressTestHarness](functions/createWordPressTestHarness.md)
- [withWordPressData](functions/withWordPressData.md)
- [createApiFetchHarness](functions/createApiFetchHarness.md)
- [withWorkspace](functions/withWorkspace.md)
- [createWorkspaceRunner](functions/createWorkspaceRunner.md)
- [createReporterMock](functions/createReporterMock.md)
- [createKernelUITestHarness](functions/createKernelUITestHarness.md)
- [ensureWpData](functions/ensureWpData.md)
- [createMockWpPackage](functions/createMockWpPackage.md)
- [setKernelPackage](functions/setKernelPackage.md)
- [setWpPluginData](functions/setWpPluginData.md)
- [setProcessEnv](functions/setProcessEnv.md)
- [clearNamespaceState](functions/clearNamespaceState.md)
