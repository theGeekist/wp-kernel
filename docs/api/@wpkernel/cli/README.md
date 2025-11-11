**@wpkernel/cli v0.12.1-beta.2**

---

# @wpkernel/cli v0.12.1-beta.2

Top-level exports for the `@wpkernel/cli` package.

This module re-exports the public surface of the CLI package so
documentation generators can build consistent API pages alongside the
wpk and UI packages.

## Classes

- [ReadinessRegistry](classes/ReadinessRegistry.md)

## Interfaces

### Commands

- [BuildCreateCommandOptions](interfaces/BuildCreateCommandOptions.md)
- [BuildDoctorCommandOptions](interfaces/BuildDoctorCommandOptions.md)
- [BuildInitCommandOptions](interfaces/BuildInitCommandOptions.md)
- [BuildStartCommandOptions](interfaces/BuildStartCommandOptions.md)
- [CheckPhpEnvironmentOptions](interfaces/CheckPhpEnvironmentOptions.md)
- [DoctorCheckResult](interfaces/DoctorCheckResult.md)
- [FileSystem](interfaces/FileSystem.md)
- [ValidateGeneratedImportsOptions](interfaces/ValidateGeneratedImportsOptions.md)

### Config

- [LoadedWPKernelConfig](interfaces/LoadedWPKernelConfig.md)
- [ResourceRegistry](interfaces/ResourceRegistry.md)
- [SchemaConfig](interfaces/SchemaConfig.md)
- [SchemaRegistry](interfaces/SchemaRegistry.md)
- [WPKernelConfigV1](interfaces/WPKernelConfigV1.md)

### AST Builders

- [CreatePhpBuilderOptions](interfaces/CreatePhpBuilderOptions.md)
- [CreateTsBuilderOptions](interfaces/CreateTsBuilderOptions.md)
- [ResourceDescriptor](interfaces/ResourceDescriptor.md)
- [TsBuilderAfterEmitOptions](interfaces/TsBuilderAfterEmitOptions.md)
- [TsBuilderCreator](interfaces/TsBuilderCreator.md)
- [TsBuilderCreatorContext](interfaces/TsBuilderCreatorContext.md)
- [TsBuilderEmitOptions](interfaces/TsBuilderEmitOptions.md)
- [TsBuilderLifecycleHooks](interfaces/TsBuilderLifecycleHooks.md)

### Adapters

- [AdapterContext](interfaces/AdapterContext.md)
- [AdapterExtension](interfaces/AdapterExtension.md)
- [AdapterExtensionContext](interfaces/AdapterExtensionContext.md)
- [AdaptersConfig](interfaces/AdaptersConfig.md)
- [PhpAdapterConfig](interfaces/PhpAdapterConfig.md)

### CLI

- [CapabilityCapabilityDescriptor](interfaces/CapabilityCapabilityDescriptor.md)

### Workspace

- [ConfirmPromptOptions](interfaces/ConfirmPromptOptions.md)
- [EnsureCleanDirectoryOptions](interfaces/EnsureCleanDirectoryOptions.md)
- [EnsureGeneratedPhpCleanOptions](interfaces/EnsureGeneratedPhpCleanOptions.md)
- [FileManifest](interfaces/FileManifest.md)
- [MergeMarkers](interfaces/MergeMarkers.md)
- [MergeOptions](interfaces/MergeOptions.md)
- [RemoveOptions](interfaces/RemoveOptions.md)
- [Workspace](interfaces/Workspace.md)
- [WriteJsonOptions](interfaces/WriteJsonOptions.md)

### IR

- [BuildIrOptions](interfaces/BuildIrOptions.md)
- [CreateIrEnvironment](interfaces/CreateIrEnvironment.md)
- [IRBlock](interfaces/IRBlock.md)
- [IRCapabilityDefinition](interfaces/IRCapabilityDefinition.md)
- [IRCapabilityHint](interfaces/IRCapabilityHint.md)
- [IRCapabilityMap](interfaces/IRCapabilityMap.md)
- [IRDiagnostic](interfaces/IRDiagnostic.md)
- [IRPhpProject](interfaces/IRPhpProject.md)
- [IRResource](interfaces/IRResource.md)
- [IRResourceCacheKey](interfaces/IRResourceCacheKey.md)
- [IRRoute](interfaces/IRRoute.md)
- [IRSchema](interfaces/IRSchema.md)
- [IRv1](interfaces/IRv1.md)
- [IRWarning](interfaces/IRWarning.md)

### Runtime

- [BuilderInput](interfaces/BuilderInput.md)
- [ConflictDiagnostic](interfaces/ConflictDiagnostic.md)
- [FragmentInput](interfaces/FragmentInput.md)
- [FragmentOutput](interfaces/FragmentOutput.md)
- [MissingDependencyDiagnostic](interfaces/MissingDependencyDiagnostic.md)
- [PipelineContext](interfaces/PipelineContext.md)
- [PipelineExtensionHookResult](interfaces/PipelineExtensionHookResult.md)
- [PipelineRunOptions](interfaces/PipelineRunOptions.md)
- [PipelineRunResult](interfaces/PipelineRunResult.md)
- [PipelineStep](interfaces/PipelineStep.md)
- [UnusedHelperDiagnostic](interfaces/UnusedHelperDiagnostic.md)

### Other

- [ApplyFlags](interfaces/ApplyFlags.md)
- [ApplyLogEntry](interfaces/ApplyLogEntry.md)
- [BuildApplyCommandOptions](interfaces/BuildApplyCommandOptions.md)
- [BuildGenerateCommandOptions](interfaces/BuildGenerateCommandOptions.md)
- [ComposerHelperDependencies](interfaces/ComposerHelperDependencies.md)
- [ComposerHelperOverrides](interfaces/ComposerHelperOverrides.md)
- [ComposerReadinessState](interfaces/ComposerReadinessState.md)
- [CreateBackupsOptions](interfaces/CreateBackupsOptions.md)
- [CreateHelperOptions](interfaces/CreateHelperOptions.md)
- [DxContext](interfaces/DxContext.md)
- [DxEnvironment](interfaces/DxEnvironment.md)
- [FileWriteRecord](interfaces/FileWriteRecord.md)
- [FileWriterSummary](interfaces/FileWriterSummary.md)
- [GenerationManifest](interfaces/GenerationManifest.md)
- [GenerationManifestFilePair](interfaces/GenerationManifestFilePair.md)
- [GenerationManifestResourceArtifacts](interfaces/GenerationManifestResourceArtifacts.md)
- [GenerationManifestResourceEntry](interfaces/GenerationManifestResourceEntry.md)
- [GenerationSummary](interfaces/GenerationSummary.md)
- [GitDependencies](interfaces/GitDependencies.md)
- [GitHelperDependencies](interfaces/GitHelperDependencies.md)
- [GitReadinessState](interfaces/GitReadinessState.md)
- [Helper](interfaces/Helper.md)
- [HelperApplyOptions](interfaces/HelperApplyOptions.md)
- [HelperDescriptor](interfaces/HelperDescriptor.md)
- [InitWorkflowOptions](interfaces/InitWorkflowOptions.md)
- [InitWorkflowResult](interfaces/InitWorkflowResult.md)
- [InstallerDependencies](interfaces/InstallerDependencies.md)
- [IrFragmentInput](interfaces/IrFragmentInput.md)
- [IrFragmentOutput](interfaces/IrFragmentOutput.md)
- [MutableIr](interfaces/MutableIr.md)
- [PatchManifest](interfaces/PatchManifest.md)
- [PatchManifestSummary](interfaces/PatchManifestSummary.md)
- [PatchRecord](interfaces/PatchRecord.md)
- [PhpDriverConfigurationOptions](interfaces/PhpDriverConfigurationOptions.md)
- [PhpDriverDependencies](interfaces/PhpDriverDependencies.md)
- [PhpDriverState](interfaces/PhpDriverState.md)
- [PhpRuntimeDependencies](interfaces/PhpRuntimeDependencies.md)
- [PhpRuntimeState](interfaces/PhpRuntimeState.md)
- [ReadinessConfirmation](interfaces/ReadinessConfirmation.md)
- [ReadinessDetection](interfaces/ReadinessDetection.md)
- [ReadinessHelper](interfaces/ReadinessHelper.md)
- [ReadinessOutcome](interfaces/ReadinessOutcome.md)
- [ReadinessPlan](interfaces/ReadinessPlan.md)
- [ReadinessRunResult](interfaces/ReadinessRunResult.md)
- [ReadinessStepResult](interfaces/ReadinessStepResult.md)
- [TsxRuntimeDependencies](interfaces/TsxRuntimeDependencies.md)
- [TsxRuntimeState](interfaces/TsxRuntimeState.md)
- [WorkspaceHygieneDependencies](interfaces/WorkspaceHygieneDependencies.md)
- [WorkspaceHygieneState](interfaces/WorkspaceHygieneState.md)

## Type Aliases

### Capability

- [CapabilityMapDefinition](type-aliases/CapabilityMapDefinition.md)
- [CapabilityMapEntry](type-aliases/CapabilityMapEntry.md)

### Commands

- [CreateCommandConstructor](type-aliases/CreateCommandConstructor.md)
- [CreateCommandInstance](type-aliases/CreateCommandInstance.md)
- [DoctorStatus](type-aliases/DoctorStatus.md)
- [InitCommandConstructor](type-aliases/InitCommandConstructor.md)
- [InitCommandInstance](type-aliases/InitCommandInstance.md)

### Config

- [ConfigOrigin](type-aliases/ConfigOrigin.md)

### Adapters

- [AdapterExtensionFactory](type-aliases/AdapterExtensionFactory.md)
- [PhpAdapterFactory](type-aliases/PhpAdapterFactory.md)

### Workspace

- [WriteOptions](type-aliases/WriteOptions.md)

### IR

- [IRCapabilityScope](type-aliases/IRCapabilityScope.md)
- [IRDiagnosticSeverity](type-aliases/IRDiagnosticSeverity.md)
- [IRRouteTransport](type-aliases/IRRouteTransport.md)
- [SchemaProvenance](type-aliases/SchemaProvenance.md)

### Runtime

- [BuilderHelper](type-aliases/BuilderHelper.md)
- [BuilderOutput](type-aliases/BuilderOutput.md)
- [BuilderWriteAction](type-aliases/BuilderWriteAction.md)
- [FragmentHelper](type-aliases/FragmentHelper.md)
- [Pipeline](type-aliases/Pipeline.md)
- [PipelineDiagnostic](type-aliases/PipelineDiagnostic.md)
- [PipelineExtension](type-aliases/PipelineExtension.md)
- [PipelineExtensionHook](type-aliases/PipelineExtensionHook.md)
- [PipelineExtensionHookOptions](type-aliases/PipelineExtensionHookOptions.md)

### Other

- [ApplyCommandConstructor](type-aliases/ApplyCommandConstructor.md)
- [ApplyCommandInstance](type-aliases/ApplyCommandInstance.md)
- [ApplyLogStatus](type-aliases/ApplyLogStatus.md)
- [BuilderHelperOptions](type-aliases/BuilderHelperOptions.md)
- [CapabilityMapScope](type-aliases/CapabilityMapScope.md)
- [CliReporter](type-aliases/CliReporter.md)
- [CommandConstructor](type-aliases/CommandConstructor.md)
- [FileWriteStatus](type-aliases/FileWriteStatus.md)
- [FragmentHelperOptions](type-aliases/FragmentHelperOptions.md)
- [HelperApplyFn](type-aliases/HelperApplyFn.md)
- [HelperKind](type-aliases/HelperKind.md)
- [HelperMode](type-aliases/HelperMode.md)
- [IrFragment](type-aliases/IrFragment.md)
- [PatchStatus](type-aliases/PatchStatus.md)
- [PipelinePhase](type-aliases/PipelinePhase.md)
- [ReadinessConfirmationStatus](type-aliases/ReadinessConfirmationStatus.md)
- [ReadinessKey](type-aliases/ReadinessKey.md)
- [ReadinessOutcomeStatus](type-aliases/ReadinessOutcomeStatus.md)
- [ReadinessStatus](type-aliases/ReadinessStatus.md)
- [ScaffoldStatus](type-aliases/ScaffoldStatus.md)

## Variables

### Commands

- [ApplyCommand](variables/ApplyCommand.md)

### IR

- [META_EXTENSION_KEY](variables/META_EXTENSION_KEY.md)
- [SCHEMA_EXTENSION_KEY](variables/SCHEMA_EXTENSION_KEY.md)

### Other

- [VERSION](variables/VERSION.md)

## Functions

### Capability

- [defineCapabilityMap](functions/defineCapabilityMap.md)

### Commands

- [buildApplyCommand](functions/buildApplyCommand.md)
- [buildCreateCommand](functions/buildCreateCommand.md)
- [buildDoctorCommand](functions/buildDoctorCommand.md)
- [buildGenerateCommand](functions/buildGenerateCommand.md)
- [buildInitCommand](functions/buildInitCommand.md)
- [buildStartCommand](functions/buildStartCommand.md)

### AST Builders

- [createApplyPlanBuilder](functions/createApplyPlanBuilder.md)
- [createBundler](functions/createBundler.md)
- [createJsBlocksBuilder](functions/createJsBlocksBuilder.md)
- [createPatcher](functions/createPatcher.md)
- [createPhpBuilder](functions/createPhpBuilder.md)
- [createTsBuilder](functions/createTsBuilder.md)

### CLI

- [runCli](functions/runCli.md)

### Workspace

- [buildWorkspace](functions/buildWorkspace.md)
- [ensureCleanDirectory](functions/ensureCleanDirectory.md)
- [ensureGeneratedPhpClean](functions/ensureGeneratedPhpClean.md)
- [promptConfirm](functions/promptConfirm.md)

### IR

- [buildIr](functions/buildIr.md)
- [createBlocksFragment](functions/createBlocksFragment.md)
- [createCapabilitiesFragment](functions/createCapabilitiesFragment.md)
- [createCapabilityMapFragment](functions/createCapabilityMapFragment.md)
- [createDiagnosticsFragment](functions/createDiagnosticsFragment.md)
- [createIr](functions/createIr.md)
- [createMetaFragment](functions/createMetaFragment.md)
- [createOrderingFragment](functions/createOrderingFragment.md)
- [createResourcesFragment](functions/createResourcesFragment.md)
- [createSchemasFragment](functions/createSchemasFragment.md)
- [createValidationFragment](functions/createValidationFragment.md)
- [registerCoreBuilders](functions/registerCoreBuilders.md)
- [registerCoreFragments](functions/registerCoreFragments.md)

### Runtime

- [createHelper](functions/createHelper.md)
- [createPipeline](functions/createPipeline.md)

### Other

- [createComposerReadinessHelper](functions/createComposerReadinessHelper.md)
- [createGitReadinessHelper](functions/createGitReadinessHelper.md)
- [createPhpDriverInstaller](functions/createPhpDriverInstaller.md)
- [createPhpDriverReadinessHelper](functions/createPhpDriverReadinessHelper.md)
- [createPhpRuntimeReadinessHelper](functions/createPhpRuntimeReadinessHelper.md)
- [createReadinessHelper](functions/createReadinessHelper.md)
- [createReadinessRegistry](functions/createReadinessRegistry.md)
- [createTsCapabilityBuilder](functions/createTsCapabilityBuilder.md)
- [createTsIndexBuilder](functions/createTsIndexBuilder.md)
- [createTsxRuntimeReadinessHelper](functions/createTsxRuntimeReadinessHelper.md)
- [createWorkspaceHygieneReadinessHelper](functions/createWorkspaceHygieneReadinessHelper.md)
- [toWorkspaceRelative](functions/toWorkspaceRelative.md)
