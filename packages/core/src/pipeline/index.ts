/**
 * Domain-specific pipeline orchestrators and helpers for WP Kernel.
 *
 * For generic pipeline primitives (createHelper, createPipeline, types),
 * import directly from '@wpkernel/pipeline'.
 *
 * This module exports:
 * - createPipelineCommit, createPipelineRollback: Domain-specific commit helpers
 * - CorePipelineContext: Context bridge for framework integration
 * - TaskInput, PipelineTask: Task-related types
 */
export { createPipelineCommit, createPipelineRollback } from './helpers/commit';
export type { TaskInput, PipelineTask } from './helpers/commit';
export type {
	CorePipelineContext,
	CorePipelineRegistryBridge,
} from './helpers/context';
