/**
 * Creates a generic pipeline helper.
 *
 * This function provides a standardized way to define pipeline steps (fragments or builders)
 * with a key, kind, and an `apply` method, along with optional dependencies.
 *
 * @category Pipeline
 * @param    options - Options for creating the helper, including key, kind, and apply logic.
 * @returns A `Helper` instance.
 */
export { createHelper } from './helper';
/**
 * Creates a new pipeline instance.
 *
 * The pipeline orchestrates the execution of helpers (fragments and builders),
 * allowing for a modular and extensible code generation process.
 *
 * @category Pipeline
 * @returns A `Pipeline` instance.
 */
export { createPipeline } from './createPipeline';
/**
 * Creates a pipeline helper for committing changes.
 *
 * This helper is typically used at the end of a pipeline phase to finalize
 * any pending changes or artifacts.
 *
 * @category Pipeline
 * @returns A pipeline helper for committing changes.
 */
export { createPipelineCommit, createPipelineRollback } from './helpers/commit';
export type {
	Helper,
	HelperApplyFn,
	HelperApplyOptions,
	HelperDescriptor,
	HelperKind,
	HelperMode,
	CreateHelperOptions,
	Pipeline,
	PipelineDiagnostic,
	MissingDependencyDiagnostic,
	UnusedHelperDiagnostic,
	PipelineExtension,
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
	PipelineExtensionRollbackErrorMetadata,
	PipelineRunState,
	PipelineStep,
	CreatePipelineOptions,
	ConflictDiagnostic,
	HelperExecutionSnapshot,
	FragmentFinalizationMetadata,
	PipelineExecutionMetadata,
} from './types';
export type {
	CorePipelineContext,
	CorePipelineRegistryBridge,
} from './helpers/context';
