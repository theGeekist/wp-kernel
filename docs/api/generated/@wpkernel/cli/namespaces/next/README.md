[**WP Kernel API v0.10.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [@wpkernel/cli](../../README.md) / next

# next

## Interfaces

- [PatchRecord](interfaces/PatchRecord.md)
- [PatchManifest](interfaces/PatchManifest.md)
- [BuildApplyCommandOptions](interfaces/BuildApplyCommandOptions.md)
- [BuildCreateCommandOptions](interfaces/BuildCreateCommandOptions.md)
- [BuildInitCommandOptions](interfaces/BuildInitCommandOptions.md)
- [CreatePhpBuilderOptions](interfaces/CreatePhpBuilderOptions.md)
- [IRResourceCacheKey](interfaces/IRResourceCacheKey.md)
- [IRWarning](interfaces/IRWarning.md)
- [IRDiagnostic](interfaces/IRDiagnostic.md)
- [IRCapabilityDefinition](interfaces/IRCapabilityDefinition.md)
- [IRCapabilityMap](interfaces/IRCapabilityMap.md)
- [MutableIr](interfaces/MutableIr.md)
- [IrFragmentInput](interfaces/IrFragmentInput.md)
- [IrFragmentOutput](interfaces/IrFragmentOutput.md)
- [PipelineContext](interfaces/PipelineContext.md)
- [PipelineRunOptions](interfaces/PipelineRunOptions.md)
- [PipelineStep](interfaces/PipelineStep.md)
- [PipelineRunResult](interfaces/PipelineRunResult.md)
- [FragmentInput](interfaces/FragmentInput.md)
- [FragmentOutput](interfaces/FragmentOutput.md)
- [BuilderInput](interfaces/BuilderInput.md)
- [PipelineExtensionHookOptions](interfaces/PipelineExtensionHookOptions.md)
- [PipelineExtensionHookResult](interfaces/PipelineExtensionHookResult.md)
- [PipelineExtension](interfaces/PipelineExtension.md)
- [FileManifest](interfaces/FileManifest.md)
- [WriteJsonOptions](interfaces/WriteJsonOptions.md)
- [RemoveOptions](interfaces/RemoveOptions.md)
- [MergeMarkers](interfaces/MergeMarkers.md)
- [MergeOptions](interfaces/MergeOptions.md)
- [Workspace](interfaces/Workspace.md)
- [EnsureGeneratedPhpCleanOptions](interfaces/EnsureGeneratedPhpCleanOptions.md)
- [EnsureCleanDirectoryOptions](interfaces/EnsureCleanDirectoryOptions.md)
- [ConfirmPromptOptions](interfaces/ConfirmPromptOptions.md)

## Type Aliases

- [PatchStatus](type-aliases/PatchStatus.md)
- [ApplyCommandConstructor](type-aliases/ApplyCommandConstructor.md)
- [CreateCommandConstructor](type-aliases/CreateCommandConstructor.md)
- [InitCommandConstructor](type-aliases/InitCommandConstructor.md)
- [SchemaProvenance](type-aliases/SchemaProvenance.md)
- [IRRouteTransport](type-aliases/IRRouteTransport.md)
- [IRDiagnosticSeverity](type-aliases/IRDiagnosticSeverity.md)
- [IRCapabilityScope](type-aliases/IRCapabilityScope.md)
- [IrFragment](type-aliases/IrFragment.md)
- [PipelineDiagnostic](type-aliases/PipelineDiagnostic.md)
- [FragmentHelper](type-aliases/FragmentHelper.md)
- [BuilderWriteAction](type-aliases/BuilderWriteAction.md)
- [BuilderOutput](type-aliases/BuilderOutput.md)
- [BuilderHelper](type-aliases/BuilderHelper.md)
- [PipelineExtensionHook](type-aliases/PipelineExtensionHook.md)
- [Pipeline](type-aliases/Pipeline.md)
- [WriteOptions](type-aliases/WriteOptions.md)

## Variables

- [NextApplyCommand](variables/NextApplyCommand.md)
- [META_EXTENSION_KEY](variables/META_EXTENSION_KEY.md)
- [SCHEMA_EXTENSION_KEY](variables/SCHEMA_EXTENSION_KEY.md)

## Functions

- [buildApplyCommand](functions/buildApplyCommand.md)
- [buildCreateCommand](functions/buildCreateCommand.md)
- [buildDoctorCommand](functions/buildDoctorCommand.md)
- [buildGenerateCommand](functions/buildGenerateCommand.md)
- [buildInitCommand](functions/buildInitCommand.md)
- [buildStartCommand](functions/buildStartCommand.md)
- [createBundler](functions/createBundler.md)
- [createPatcher](functions/createPatcher.md)
- [createPhpBuilder](functions/createPhpBuilder.md)
- [createApplyPlanBuilder](functions/createApplyPlanBuilder.md)
- [createTsBuilder](functions/createTsBuilder.md)
- [createJsBlocksBuilder](functions/createJsBlocksBuilder.md)
- [registerCoreFragments](functions/registerCoreFragments.md)
- [registerCoreBuilders](functions/registerCoreBuilders.md)
- [createIr](functions/createIr.md)
- [createBlocksFragment](functions/createBlocksFragment.md)
- [createCapabilitiesFragment](functions/createCapabilitiesFragment.md)
- [createCapabilityMapFragment](functions/createCapabilityMapFragment.md)
- [createDiagnosticsFragment](functions/createDiagnosticsFragment.md)
- [createMetaFragment](functions/createMetaFragment.md)
- [createOrderingFragment](functions/createOrderingFragment.md)
- [createResourcesFragment](functions/createResourcesFragment.md)
- [createSchemasFragment](functions/createSchemasFragment.md)
- [createValidationFragment](functions/createValidationFragment.md)
- [createHelper](functions/createHelper.md)
- [createPipeline](functions/createPipeline.md)
- [buildWorkspace](functions/buildWorkspace.md)
- [toWorkspaceRelative](functions/toWorkspaceRelative.md)
- [ensureGeneratedPhpClean](functions/ensureGeneratedPhpClean.md)
- [ensureCleanDirectory](functions/ensureCleanDirectory.md)
- [promptConfirm](functions/promptConfirm.md)
- [createPhpDriverInstaller](functions/createPhpDriverInstaller.md)

## References

### PhpDriverConfigurationOptions

Re-exports [PhpDriverConfigurationOptions](../../../../php-json-ast/src/interfaces/PhpDriverConfigurationOptions.md)

---

### Helper

Re-exports [Helper](../../../../php-json-ast/src/interfaces/Helper.md)

---

### HelperApplyFn

Re-exports [HelperApplyFn](../../../../php-json-ast/src/type-aliases/HelperApplyFn.md)

---

### HelperApplyOptions

Re-exports [HelperApplyOptions](../../../../php-json-ast/src/interfaces/HelperApplyOptions.md)

---

### HelperDescriptor

Re-exports [HelperDescriptor](../../../../php-json-ast/src/interfaces/HelperDescriptor.md)

---

### HelperKind

Re-exports [HelperKind](../../../../php-json-ast/src/type-aliases/HelperKind.md)

---

### HelperMode

Re-exports [HelperMode](../../../../php-json-ast/src/type-aliases/HelperMode.md)

---

### CreateHelperOptions

Re-exports [CreateHelperOptions](../../../../php-json-ast/src/interfaces/CreateHelperOptions.md)

---

### buildIr

Re-exports [buildIr](../../functions/buildIr.md)

---

### BuildIrOptions

Re-exports [BuildIrOptions](../../interfaces/BuildIrOptions.md)

---

### IRBlock

Re-exports [IRBlock](../../interfaces/IRBlock.md)

---

### IRPhpProject

Re-exports [IRPhpProject](../../interfaces/IRPhpProject.md)

---

### IRCapabilityHint

Re-exports [IRCapabilityHint](../../interfaces/IRCapabilityHint.md)

---

### IRResource

Re-exports [IRResource](../../interfaces/IRResource.md)

---

### IRRoute

Re-exports [IRRoute](../../interfaces/IRRoute.md)

---

### IRSchema

Re-exports [IRSchema](../../interfaces/IRSchema.md)

---

### IRv1

Re-exports [IRv1](../../interfaces/IRv1.md)

---

### PipelinePhase

Re-exports [PipelinePhase](../../../../php-json-ast/src/type-aliases/PipelinePhase.md)
