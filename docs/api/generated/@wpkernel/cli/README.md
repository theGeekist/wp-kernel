[**WP Kernel API v0.10.0**](../../README.md)

---

[WP Kernel API](../../README.md) / @wpkernel/cli

# @wpkernel/cli

Top-level exports for the `@wpkernel/cli` package.

This module re-exports the public surface of the CLI package so
documentation generators can build consistent API pages alongside the
kernel and UI packages.

## Interfaces

- [AdapterContext](interfaces/AdapterContext.md)
- [AdapterExtension](interfaces/AdapterExtension.md)
- [AdapterExtensionContext](interfaces/AdapterExtensionContext.md)
- [AdaptersConfig](interfaces/AdaptersConfig.md)
- [BuildApplyCommandOptions](interfaces/BuildApplyCommandOptions.md)
- [BuildCreateCommandOptions](interfaces/BuildCreateCommandOptions.md)
- [BuilderInput](interfaces/BuilderInput.md)
- [BuildGenerateCommandOptions](interfaces/BuildGenerateCommandOptions.md)
- [BuildInitCommandOptions](interfaces/BuildInitCommandOptions.md)
- [BuildIrOptions](interfaces/BuildIrOptions.md)
- [CapabilityCapabilityDescriptor](interfaces/CapabilityCapabilityDescriptor.md)
- [ConfirmPromptOptions](interfaces/ConfirmPromptOptions.md)
- [CreateHelperOptions](interfaces/CreateHelperOptions.md)
- [CreatePhpBuilderOptions](interfaces/CreatePhpBuilderOptions.md)
- [EnsureCleanDirectoryOptions](interfaces/EnsureCleanDirectoryOptions.md)
- [EnsureGeneratedPhpCleanOptions](interfaces/EnsureGeneratedPhpCleanOptions.md)
- [FileManifest](interfaces/FileManifest.md)
- [FragmentInput](interfaces/FragmentInput.md)
- [FragmentOutput](interfaces/FragmentOutput.md)
- [Helper](interfaces/Helper.md)
- [HelperApplyOptions](interfaces/HelperApplyOptions.md)
- [HelperDescriptor](interfaces/HelperDescriptor.md)
- [IRBlock](interfaces/IRBlock.md)
- [IRCapabilityDefinition](interfaces/IRCapabilityDefinition.md)
- [IRCapabilityHint](interfaces/IRCapabilityHint.md)
- [IRCapabilityMap](interfaces/IRCapabilityMap.md)
- [IRDiagnostic](interfaces/IRDiagnostic.md)
- [IrFragmentInput](interfaces/IrFragmentInput.md)
- [IrFragmentOutput](interfaces/IrFragmentOutput.md)
- [IRPhpProject](interfaces/IRPhpProject.md)
- [IRResource](interfaces/IRResource.md)
- [IRResourceCacheKey](interfaces/IRResourceCacheKey.md)
- [IRRoute](interfaces/IRRoute.md)
- [IRSchema](interfaces/IRSchema.md)
- [IRv1](interfaces/IRv1.md)
- [IRWarning](interfaces/IRWarning.md)
- [LoadedWPKernelConfig](interfaces/LoadedWPKernelConfig.md)
- [MergeMarkers](interfaces/MergeMarkers.md)
- [MergeOptions](interfaces/MergeOptions.md)
- [MutableIr](interfaces/MutableIr.md)
- [PatchManifest](interfaces/PatchManifest.md)
- [PatchRecord](interfaces/PatchRecord.md)
- [PhpAdapterConfig](interfaces/PhpAdapterConfig.md)
- [PipelineContext](interfaces/PipelineContext.md)
- [PipelineExtension](interfaces/PipelineExtension.md)
- [PipelineExtensionHookOptions](interfaces/PipelineExtensionHookOptions.md)
- [PipelineExtensionHookResult](interfaces/PipelineExtensionHookResult.md)
- [PipelineRunOptions](interfaces/PipelineRunOptions.md)
- [PipelineRunResult](interfaces/PipelineRunResult.md)
- [PipelineStep](interfaces/PipelineStep.md)
- [RemoveOptions](interfaces/RemoveOptions.md)
- [SchemaConfig](interfaces/SchemaConfig.md)
- [Workspace](interfaces/Workspace.md)
- [WPKernelConfigV1](interfaces/WPKernelConfigV1.md)
- [WriteJsonOptions](interfaces/WriteJsonOptions.md)

## Type Aliases

- [AdapterExtensionFactory](type-aliases/AdapterExtensionFactory.md)
- [ApplyCommandConstructor](type-aliases/ApplyCommandConstructor.md)
- [BuilderHelper](type-aliases/BuilderHelper.md)
- [BuilderOutput](type-aliases/BuilderOutput.md)
- [BuilderWriteAction](type-aliases/BuilderWriteAction.md)
- [CapabilityMapDefinition](type-aliases/CapabilityMapDefinition.md)
- [CapabilityMapEntry](type-aliases/CapabilityMapEntry.md)
- [CapabilityMapScope](type-aliases/CapabilityMapScope.md)
- [ConfigOrigin](type-aliases/ConfigOrigin.md)
- [CreateCommandConstructor](type-aliases/CreateCommandConstructor.md)
- [FragmentHelper](type-aliases/FragmentHelper.md)
- [HelperApplyFn](type-aliases/HelperApplyFn.md)
- [HelperKind](type-aliases/HelperKind.md)
- [HelperMode](type-aliases/HelperMode.md)
- [InitCommandConstructor](type-aliases/InitCommandConstructor.md)
- [IRCapabilityScope](type-aliases/IRCapabilityScope.md)
- [IRDiagnosticSeverity](type-aliases/IRDiagnosticSeverity.md)
- [IrFragment](type-aliases/IrFragment.md)
- [IRRouteTransport](type-aliases/IRRouteTransport.md)
- [PatchStatus](type-aliases/PatchStatus.md)
- [PhpAdapterFactory](type-aliases/PhpAdapterFactory.md)
- [Pipeline](type-aliases/Pipeline.md)
- [PipelineDiagnostic](type-aliases/PipelineDiagnostic.md)
- [PipelineExtensionHook](type-aliases/PipelineExtensionHook.md)
- [SchemaProvenance](type-aliases/SchemaProvenance.md)
- [WriteOptions](type-aliases/WriteOptions.md)

## Variables

- [ApplyCommand](variables/ApplyCommand.md)
- [META_EXTENSION_KEY](variables/META_EXTENSION_KEY.md)
- [SCHEMA_EXTENSION_KEY](variables/SCHEMA_EXTENSION_KEY.md)
- [VERSION](variables/VERSION.md)

## Functions

- [buildApplyCommand](functions/buildApplyCommand.md)
- [buildCreateCommand](functions/buildCreateCommand.md)
- [buildDoctorCommand](functions/buildDoctorCommand.md)
- [buildGenerateCommand](functions/buildGenerateCommand.md)
- [buildInitCommand](functions/buildInitCommand.md)
- [buildIr](functions/buildIr.md)
- [buildStartCommand](functions/buildStartCommand.md)
- [buildWorkspace](functions/buildWorkspace.md)
- [createApplyPlanBuilder](functions/createApplyPlanBuilder.md)
- [createBlocksFragment](functions/createBlocksFragment.md)
- [createBundler](functions/createBundler.md)
- [createCapabilitiesFragment](functions/createCapabilitiesFragment.md)
- [createCapabilityMapFragment](functions/createCapabilityMapFragment.md)
- [createDiagnosticsFragment](functions/createDiagnosticsFragment.md)
- [createHelper](functions/createHelper.md)
- [createIr](functions/createIr.md)
- [createJsBlocksBuilder](functions/createJsBlocksBuilder.md)
- [createMetaFragment](functions/createMetaFragment.md)
- [createOrderingFragment](functions/createOrderingFragment.md)
- [createPatcher](functions/createPatcher.md)
- [createPhpBuilder](functions/createPhpBuilder.md)
- [createPhpDriverInstaller](functions/createPhpDriverInstaller.md)
- [createPipeline](functions/createPipeline.md)
- [createResourcesFragment](functions/createResourcesFragment.md)
- [createSchemasFragment](functions/createSchemasFragment.md)
- [createTsBuilder](functions/createTsBuilder.md)
- [createValidationFragment](functions/createValidationFragment.md)
- [defineCapabilityMap](functions/defineCapabilityMap.md)
- [ensureCleanDirectory](functions/ensureCleanDirectory.md)
- [ensureGeneratedPhpClean](functions/ensureGeneratedPhpClean.md)
- [promptConfirm](functions/promptConfirm.md)
- [registerCoreBuilders](functions/registerCoreBuilders.md)
- [registerCoreFragments](functions/registerCoreFragments.md)
- [runCli](functions/runCli.md)
- [toWorkspaceRelative](functions/toWorkspaceRelative.md)

## References

### PhpDriverConfigurationOptions

Re-exports [PhpDriverConfigurationOptions](../../php-json-ast/src/interfaces/PhpDriverConfigurationOptions.md)

---

### PipelinePhase

Re-exports [PipelinePhase](../../php-json-ast/src/type-aliases/PipelinePhase.md)
