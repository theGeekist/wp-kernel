**@wpkernel/cli v0.11.0**

---

# @wpkernel/cli v0.11.0

Top-level exports for the `@wpkernel/cli` package.

This module re-exports the public surface of the CLI package so
documentation generators can build consistent API pages alongside the
kernel and UI packages.

## Interfaces

### Pipeline

- [PipelineRunOptions](interfaces/PipelineRunOptions.md)
- [PipelineRunResult](interfaces/PipelineRunResult.md)
- [PipelineStep](interfaces/PipelineStep.md)
- [ConflictDiagnostic](interfaces/ConflictDiagnostic.md)
- [BuilderInput](interfaces/BuilderInput.md)
- [FragmentInput](interfaces/FragmentInput.md)
- [FragmentOutput](interfaces/FragmentOutput.md)
- [PipelineContext](interfaces/PipelineContext.md)
- [PipelineExtension](interfaces/PipelineExtension.md)
- [PipelineExtensionHookOptions](interfaces/PipelineExtensionHookOptions.md)
- [PipelineExtensionHookResult](interfaces/PipelineExtensionHookResult.md)

### IR

- [IRv1](interfaces/IRv1.md)
- [IRSchema](interfaces/IRSchema.md)
- [IRResource](interfaces/IRResource.md)
- [IRRoute](interfaces/IRRoute.md)
- [IRCapabilityHint](interfaces/IRCapabilityHint.md)
- [IRBlock](interfaces/IRBlock.md)
- [IRPhpProject](interfaces/IRPhpProject.md)
- [BuildIrOptions](interfaces/BuildIrOptions.md)
- [CreateIrEnvironment](interfaces/CreateIrEnvironment.md)
- [IRDiagnostic](interfaces/IRDiagnostic.md)
- [IRCapabilityDefinition](interfaces/IRCapabilityDefinition.md)
- [IRCapabilityMap](interfaces/IRCapabilityMap.md)
- [IRResourceCacheKey](interfaces/IRResourceCacheKey.md)
- [IRWarning](interfaces/IRWarning.md)

### Create Command

- [BuildCreateCommandOptions](interfaces/BuildCreateCommandOptions.md)

### Doctor Command

- [BuildDoctorCommandOptions](interfaces/BuildDoctorCommandOptions.md)
- [DoctorCheckResult](interfaces/DoctorCheckResult.md)
- [CheckPhpEnvironmentOptions](interfaces/CheckPhpEnvironmentOptions.md)

### Generate Command

- [ValidateGeneratedImportsOptions](interfaces/ValidateGeneratedImportsOptions.md)

### Init Command

- [BuildInitCommandOptions](interfaces/BuildInitCommandOptions.md)

### Other

- [WPKernelConfigV1](interfaces/WPKernelConfigV1.md)
- [SchemaConfig](interfaces/SchemaConfig.md)
- [SchemaRegistry](interfaces/SchemaRegistry.md)
- [ResourceRegistry](interfaces/ResourceRegistry.md)
- [AdaptersConfig](interfaces/AdaptersConfig.md)
- [PhpAdapterConfig](interfaces/PhpAdapterConfig.md)
- [AdapterContext](interfaces/AdapterContext.md)
- [AdapterExtension](interfaces/AdapterExtension.md)
- [AdapterExtensionContext](interfaces/AdapterExtensionContext.md)
- [LoadedWPKernelConfig](interfaces/LoadedWPKernelConfig.md)
- [CapabilityCapabilityDescriptor](interfaces/CapabilityCapabilityDescriptor.md)
- [Helper](interfaces/Helper.md)
- [HelperApplyOptions](interfaces/HelperApplyOptions.md)
- [HelperDescriptor](interfaces/HelperDescriptor.md)
- [CreateHelperOptions](interfaces/CreateHelperOptions.md)
- [MutableIr](interfaces/MutableIr.md)
- [IrFragmentInput](interfaces/IrFragmentInput.md)
- [IrFragmentOutput](interfaces/IrFragmentOutput.md)
- [CreatePhpBuilderOptions](interfaces/CreatePhpBuilderOptions.md)
- [PhpDriverConfigurationOptions](interfaces/PhpDriverConfigurationOptions.md)
- [Workspace](interfaces/Workspace.md)
- [FileManifest](interfaces/FileManifest.md)
- [MergeOptions](interfaces/MergeOptions.md)
- [MergeMarkers](interfaces/MergeMarkers.md)
- [WriteJsonOptions](interfaces/WriteJsonOptions.md)
- [RemoveOptions](interfaces/RemoveOptions.md)
- [GenerationManifest](interfaces/GenerationManifest.md)
- [GenerationManifestResourceEntry](interfaces/GenerationManifestResourceEntry.md)
- [GenerationManifestResourceArtifacts](interfaces/GenerationManifestResourceArtifacts.md)
- [GenerationManifestFilePair](interfaces/GenerationManifestFilePair.md)
- [PatchManifest](interfaces/PatchManifest.md)
- [PatchManifestSummary](interfaces/PatchManifestSummary.md)
- [PatchRecord](interfaces/PatchRecord.md)
- [ApplyLogEntry](interfaces/ApplyLogEntry.md)
- [ApplyFlags](interfaces/ApplyFlags.md)
- [CreateBackupsOptions](interfaces/CreateBackupsOptions.md)
- [BuildApplyCommandOptions](interfaces/BuildApplyCommandOptions.md)
- [InitWorkflowOptions](interfaces/InitWorkflowOptions.md)
- [InitWorkflowResult](interfaces/InitWorkflowResult.md)
- [GitDependencies](interfaces/GitDependencies.md)
- [InstallerDependencies](interfaces/InstallerDependencies.md)
- [BuildGenerateCommandOptions](interfaces/BuildGenerateCommandOptions.md)
- [GenerationSummary](interfaces/GenerationSummary.md)
- [FileWriterSummary](interfaces/FileWriterSummary.md)
- [FileWriteRecord](interfaces/FileWriteRecord.md)

### Start Command

- [BuildStartCommandOptions](interfaces/BuildStartCommandOptions.md)
- [FileSystem](interfaces/FileSystem.md)

### TypeScript Builder

- [CreateTsBuilderOptions](interfaces/CreateTsBuilderOptions.md)
- [TsBuilderCreator](interfaces/TsBuilderCreator.md)
- [TsBuilderCreatorContext](interfaces/TsBuilderCreatorContext.md)
- [TsBuilderLifecycleHooks](interfaces/TsBuilderLifecycleHooks.md)
- [TsBuilderAfterEmitOptions](interfaces/TsBuilderAfterEmitOptions.md)
- [TsBuilderEmitOptions](interfaces/TsBuilderEmitOptions.md)
- [ResourceDescriptor](interfaces/ResourceDescriptor.md)

### Workspace Utilities

- [EnsureGeneratedPhpCleanOptions](interfaces/EnsureGeneratedPhpCleanOptions.md)
- [EnsureCleanDirectoryOptions](interfaces/EnsureCleanDirectoryOptions.md)
- [ConfirmPromptOptions](interfaces/ConfirmPromptOptions.md)

## Type Aliases

### Capability

- [CapabilityMapDefinition](type-aliases/CapabilityMapDefinition.md)
- [CapabilityMapEntry](type-aliases/CapabilityMapEntry.md)
- [CapabilityMapFunction](type-aliases/CapabilityMapFunction.md)

### Pipeline

- [Pipeline](type-aliases/Pipeline.md)
- [PipelineDiagnostic](type-aliases/PipelineDiagnostic.md)
- [BuilderOutput](type-aliases/BuilderOutput.md)
- [BuilderWriteAction](type-aliases/BuilderWriteAction.md)
- [BuilderHelper](type-aliases/BuilderHelper.md)
- [FragmentHelper](type-aliases/FragmentHelper.md)
- [PipelineExtensionHook](type-aliases/PipelineExtensionHook.md)

### IR

- [IRDiagnosticSeverity](type-aliases/IRDiagnosticSeverity.md)
- [IRCapabilityScope](type-aliases/IRCapabilityScope.md)
- [IRRouteTransport](type-aliases/IRRouteTransport.md)
- [SchemaProvenance](type-aliases/SchemaProvenance.md)

### Create Command

- [CreateCommandConstructor](type-aliases/CreateCommandConstructor.md)
- [CreateCommandInstance](type-aliases/CreateCommandInstance.md)

### Doctor Command

- [DoctorStatus](type-aliases/DoctorStatus.md)

### Init Command

- [InitCommandConstructor](type-aliases/InitCommandConstructor.md)
- [InitCommandInstance](type-aliases/InitCommandInstance.md)

### Other

- [PhpAdapterFactory](type-aliases/PhpAdapterFactory.md)
- [AdapterExtensionFactory](type-aliases/AdapterExtensionFactory.md)
- [ConfigOrigin](type-aliases/ConfigOrigin.md)
- [CapabilityMapScope](type-aliases/CapabilityMapScope.md)
- [HelperApplyFn](type-aliases/HelperApplyFn.md)
- [HelperKind](type-aliases/HelperKind.md)
- [HelperMode](type-aliases/HelperMode.md)
- [FragmentHelperOptions](type-aliases/FragmentHelperOptions.md)
- [BuilderHelperOptions](type-aliases/BuilderHelperOptions.md)
- [CliReporter](type-aliases/CliReporter.md)
- [PipelinePhase](type-aliases/PipelinePhase.md)
- [IrFragment](type-aliases/IrFragment.md)
- [WriteOptions](type-aliases/WriteOptions.md)
- [PatchStatus](type-aliases/PatchStatus.md)
- [ApplyLogStatus](type-aliases/ApplyLogStatus.md)
- [ApplyCommandConstructor](type-aliases/ApplyCommandConstructor.md)
- [ApplyCommandInstance](type-aliases/ApplyCommandInstance.md)
- [ScaffoldStatus](type-aliases/ScaffoldStatus.md)
- [CommandConstructor](type-aliases/CommandConstructor.md)
- [FileWriteStatus](type-aliases/FileWriteStatus.md)

## Variables

### Apply Command

- [ApplyCommand](variables/ApplyCommand.md)

### IR Fragments

- [META_EXTENSION_KEY](variables/META_EXTENSION_KEY.md)
- [SCHEMA_EXTENSION_KEY](variables/SCHEMA_EXTENSION_KEY.md)

### Other

- [VERSION](variables/VERSION.md)

## Functions

### Capability

- [defineCapabilityMap](functions/defineCapabilityMap.md)

### Pipeline

- [createHelper](functions/createHelper.md)
- [createPipeline](functions/createPipeline.md)

### CLI

- [runCli](functions/runCli.md)

### Workspace

- [buildWorkspace](functions/buildWorkspace.md)

### IR

- [buildIr](functions/buildIr.md)
- [createIr](functions/createIr.md)
- [registerCoreFragments](functions/registerCoreFragments.md)
- [registerCoreBuilders](functions/registerCoreBuilders.md)

### Runtime

- [createHelper](functions/createHelper.md)

### Apply Command

- [buildApplyCommand](functions/buildApplyCommand.md)

### Apply Plan

- [createApplyPlanBuilder](functions/createApplyPlanBuilder.md)

### Bundler

- [createBundler](functions/createBundler.md)

### Create Command

- [buildCreateCommand](functions/buildCreateCommand.md)

### Doctor Command

- [buildDoctorCommand](functions/buildDoctorCommand.md)

### Generate Command

- [buildGenerateCommand](functions/buildGenerateCommand.md)

### IR Fragments

- [createMetaFragment](functions/createMetaFragment.md)
- [createSchemasFragment](functions/createSchemasFragment.md)
- [createResourcesFragment](functions/createResourcesFragment.md)
- [createCapabilitiesFragment](functions/createCapabilitiesFragment.md)
- [createCapabilityMapFragment](functions/createCapabilityMapFragment.md)
- [createDiagnosticsFragment](functions/createDiagnosticsFragment.md)
- [createBlocksFragment](functions/createBlocksFragment.md)
- [createOrderingFragment](functions/createOrderingFragment.md)
- [createValidationFragment](functions/createValidationFragment.md)

### Init Command

- [buildInitCommand](functions/buildInitCommand.md)

### Other

- [createPhpDriverInstaller](functions/createPhpDriverInstaller.md)
- [toWorkspaceRelative](functions/toWorkspaceRelative.md)

### PHP Builder

- [createPhpBuilder](functions/createPhpBuilder.md)

### Patcher

- [createPatcher](functions/createPatcher.md)

### Start Command

- [buildStartCommand](functions/buildStartCommand.md)

### TypeScript Builder

- [createTsBuilder](functions/createTsBuilder.md)
- [createJsBlocksBuilder](functions/createJsBlocksBuilder.md)

### Workspace Utilities

- [ensureGeneratedPhpClean](functions/ensureGeneratedPhpClean.md)
- [ensureCleanDirectory](functions/ensureCleanDirectory.md)
- [promptConfirm](functions/promptConfirm.md)
