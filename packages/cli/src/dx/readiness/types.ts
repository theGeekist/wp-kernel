import type { DxContext } from '../context';

/**
 * Identifier for a readiness unit managed by the DX orchestrator.
 */
export type ReadinessKey =
	| 'composer'
	| 'git'
	| 'php-driver'
	| 'php-runtime'
	| 'bootstrapper-resolution'
	| 'release-pack'
	| 'tsx-runtime'
	| 'workspace-hygiene';

/**
 * Status emitted during the detect/prepare/execute phases.
 */
export type ReadinessStatus = 'ready' | 'pending' | 'blocked';

/**
 * Status emitted during the confirm phase once a readiness unit completes.
 */
export type ReadinessConfirmationStatus = 'ready' | 'pending';

/**
 * Result produced by the detect phase for a readiness unit.
 */
export interface ReadinessDetection<State> {
	readonly status: ReadinessStatus;
	readonly state: State;
	readonly message?: string;
}

/**
 * Shared shape for prepare and execute phase results.
 */
export interface ReadinessStepResult<State> {
	readonly state: State;
	readonly cleanup?: () => Promise<void> | void;
}

/**
 * Result emitted by the confirm phase.
 */
export interface ReadinessConfirmation<State> {
	readonly status: ReadinessConfirmationStatus;
	readonly state: State;
	readonly message?: string;
}

/**
 * Aggregated outcome for a readiness unit after orchestrator execution.
 */
export interface ReadinessOutcome<State = unknown> {
	readonly key: ReadinessKey;
	readonly status: ReadinessOutcomeStatus;
	readonly detection?: ReadinessDetection<State>;
	readonly confirmation?: ReadinessConfirmation<State>;
	readonly error?: unknown;
}

/**
 * High-level status assigned to a readiness unit after orchestration.
 */
export type ReadinessOutcomeStatus =
	| 'ready'
	| 'updated'
	| 'pending'
	| 'blocked'
	| 'failed';

/**
 * Contract implemented by readiness helpers.
 */
export interface ReadinessHelper<State = unknown> {
	readonly key: ReadinessKey;
	readonly detect: (context: DxContext) => Promise<ReadinessDetection<State>>;
	readonly prepare?: (
		context: DxContext,
		state: State
	) => Promise<ReadinessStepResult<State>>;
	readonly execute?: (
		context: DxContext,
		state: State
	) => Promise<ReadinessStepResult<State>>;
	readonly confirm: (
		context: DxContext,
		state: State
	) => Promise<ReadinessConfirmation<State>>;
	readonly rollback?: (context: DxContext, state: State) => Promise<void>;
}

/**
 * Planner returned from the readiness registry when orchestrating units.
 */
export interface ReadinessPlan {
	readonly keys: readonly ReadinessKey[];
	readonly run: (context: DxContext) => Promise<ReadinessRunResult>;
}

/**
 * Summary returned after running a readiness plan.
 */
export interface ReadinessRunResult {
	readonly outcomes: ReadinessOutcome[];
	readonly error?: unknown;
}
