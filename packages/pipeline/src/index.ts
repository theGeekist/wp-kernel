// Main API exports
export { createHelper } from './helper';
export { executeHelpers } from './executor';
export type { ErrorFactory } from './error-factory';
export { createDefaultError, createErrorFactory } from './error-factory';
export {
	registerHelper,
	registerExtensionHook,
	handleExtensionRegisterResult,
} from './registration';

// Type exports (all types consumers need)
export type {
	// Core pipeline types
	Pipeline,
	CreatePipelineOptions,
	PipelineReporter,
	PipelineExtension,
	PipelineExtensionHook,
	PipelineExtensionHookOptions,
	PipelineExtensionHookResult,
	PipelineDiagnostic,

	// Helper types
	Helper,
	HelperDescriptor,
	HelperKind,
	HelperMode,
	CreateHelperOptions,
	HelperApplyOptions,

	// Utility types
	MaybePromise,
	PipelineStep,
	PipelineRunState,
	HelperExecutionSnapshot,
	PipelineExecutionMetadata,
	PipelineExtensionRollbackErrorMetadata,
} from './types';

// Re-export dependency graph utilities for advanced use cases
export type {
	RegisteredHelper,
	MissingDependencyIssue,
} from './dependency-graph';
export { createHelperId, compareHelpers } from './dependency-graph';

// Re-export async utilities for helper authors
export {
	isPromiseLike,
	maybeThen,
	maybeTry,
	processSequentially,
} from './async-utils';

// Re-export extension utilities for extension authors
export type {
	ExtensionHookEntry,
	ExtensionHookExecution,
	RollbackErrorArgs,
} from './extensions';
export { createRollbackErrorMetadata } from './extensions';
