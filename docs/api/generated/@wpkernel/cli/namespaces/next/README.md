[**WP Kernel API v0.10.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [@wpkernel/cli](../../README.md) / next

# next

## Interfaces

- [BuildApplyCommandOptions](interfaces/BuildApplyCommandOptions.md)
- [BuildCreateCommandOptions](interfaces/BuildCreateCommandOptions.md)
- [BuilderInput](interfaces/BuilderInput.md)
- [BuildInitCommandOptions](interfaces/BuildInitCommandOptions.md)
- [ConfirmPromptOptions](interfaces/ConfirmPromptOptions.md)
- [CreatePhpBuilderOptions](interfaces/CreatePhpBuilderOptions.md)
- [EnsureCleanDirectoryOptions](interfaces/EnsureCleanDirectoryOptions.md)
- [EnsureGeneratedPhpCleanOptions](interfaces/EnsureGeneratedPhpCleanOptions.md)
- [FileManifest](interfaces/FileManifest.md)
- [FragmentInput](interfaces/FragmentInput.md)
- [FragmentOutput](interfaces/FragmentOutput.md)
- [IRCapabilityDefinition](interfaces/IRCapabilityDefinition.md)
- [IRCapabilityMap](interfaces/IRCapabilityMap.md)
- [IRDiagnostic](interfaces/IRDiagnostic.md)
- [IrFragmentInput](interfaces/IrFragmentInput.md)
- [IrFragmentOutput](interfaces/IrFragmentOutput.md)
- [IRResourceCacheKey](interfaces/IRResourceCacheKey.md)
- [IRWarning](interfaces/IRWarning.md)
- [MergeMarkers](interfaces/MergeMarkers.md)
- [MergeOptions](interfaces/MergeOptions.md)
- [MutableIr](interfaces/MutableIr.md)
- [PatchManifest](interfaces/PatchManifest.md)
- [PatchRecord](interfaces/PatchRecord.md)
- [PipelineContext](interfaces/PipelineContext.md)
- [PipelineExtension](interfaces/PipelineExtension.md)
- [PipelineExtensionHookOptions](interfaces/PipelineExtensionHookOptions.md)
- [PipelineExtensionHookResult](interfaces/PipelineExtensionHookResult.md)
- [PipelineRunOptions](interfaces/PipelineRunOptions.md)
- [PipelineRunResult](interfaces/PipelineRunResult.md)
- [PipelineStep](interfaces/PipelineStep.md)
- [RemoveOptions](interfaces/RemoveOptions.md)
- [Workspace](interfaces/Workspace.md)
- [WriteJsonOptions](interfaces/WriteJsonOptions.md)

## Type Aliases

- [ApplyCommandConstructor](type-aliases/ApplyCommandConstructor.md)
- [BuilderHelper](type-aliases/BuilderHelper.md)
- [BuilderOutput](type-aliases/BuilderOutput.md)
- [BuilderWriteAction](type-aliases/BuilderWriteAction.md)
- [CreateCommandConstructor](type-aliases/CreateCommandConstructor.md)
- [FragmentHelper](type-aliases/FragmentHelper.md)
- [InitCommandConstructor](type-aliases/InitCommandConstructor.md)
- [IRCapabilityScope](type-aliases/IRCapabilityScope.md)
- [IRDiagnosticSeverity](type-aliases/IRDiagnosticSeverity.md)
- [IrFragment](type-aliases/IrFragment.md)
- [IRRouteTransport](type-aliases/IRRouteTransport.md)
- [PatchStatus](type-aliases/PatchStatus.md)
- [Pipeline](type-aliases/Pipeline.md)
- [PipelineDiagnostic](type-aliases/PipelineDiagnostic.md)
- [PipelineExtensionHook](type-aliases/PipelineExtensionHook.md)
- [SchemaProvenance](type-aliases/SchemaProvenance.md)
- [WriteOptions](type-aliases/WriteOptions.md)

## Variables

- [META_EXTENSION_KEY](variables/META_EXTENSION_KEY.md)
- [NextApplyCommand](variables/NextApplyCommand.md)
- [SCHEMA_EXTENSION_KEY](variables/SCHEMA_EXTENSION_KEY.md)

## Functions

- [buildApplyCommand](functions/buildApplyCommand.md)
- [buildCreateCommand](functions/buildCreateCommand.md)
- [buildDoctorCommand](functions/buildDoctorCommand.md)
- [buildGenerateCommand](functions/buildGenerateCommand.md)
- [buildInitCommand](functions/buildInitCommand.md)
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
- [ensureCleanDirectory](functions/ensureCleanDirectory.md)
- [ensureGeneratedPhpClean](functions/ensureGeneratedPhpClean.md)
- [promptConfirm](functions/promptConfirm.md)
- [registerCoreBuilders](functions/registerCoreBuilders.md)
- [registerCoreFragments](functions/registerCoreFragments.md)
- [toWorkspaceRelative](functions/toWorkspaceRelative.md)

## References

### buildIr

Re-exports [buildIr](../../functions/buildIr.md)

---

### BuildIrOptions

Re-exports [BuildIrOptions](../../interfaces/BuildIrOptions.md)

---

### CreateHelperOptions

Re-exports [CreateHelperOptions](../../../../php-json-ast/src/interfaces/CreateHelperOptions.md)

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

### IRBlock

Re-exports [IRBlock](../../interfaces/IRBlock.md)

---

### IRCapabilityHint

Re-exports [IRCapabilityHint](../../interfaces/IRCapabilityHint.md)

---

### IRPhpProject

Re-exports [IRPhpProject](../../interfaces/IRPhpProject.md)

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

### PhpDriverConfigurationOptions

Re-exports [PhpDriverConfigurationOptions](../../../../php-json-ast/src/interfaces/PhpDriverConfigurationOptions.md)

---

### PipelinePhase

Re-exports [PipelinePhase](../../../../php-json-ast/src/type-aliases/PipelinePhase.md)
