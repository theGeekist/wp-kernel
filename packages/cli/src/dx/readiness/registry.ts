import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import type { DxContext } from '../context';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
	ReadinessHelperMetadata,
	ReadinessKey,
	ReadinessOutcome,
	ReadinessOutcomeStatus,
	ReadinessPlan,
	ReadinessRunResult,
} from './types';
import {
	logPhaseStart,
	logPhaseSuccess,
	logPhaseFailure,
	logDetectionResult,
	logConfirmationResult,
	logOutcome,
	serialiseUnknown,
	type ReadinessPhase,
} from './registry.logging';

interface ExecutedHelper<State> {
	readonly helper: ReadinessHelper<State>;
	readonly state: State;
	readonly cleanups: readonly (() => Promise<void> | void)[];
}

interface RegisteredHelper {
	readonly helper: ReadinessHelper<unknown>;
	readonly order: number;
	readonly index: number;
}

export interface ReadinessHelperDescriptor {
	readonly key: ReadinessKey;
	readonly metadata: ReadinessHelperMetadata;
}

async function runCleanup(
	steps: readonly (() => Promise<void> | void)[]
): Promise<unknown[]> {
	const errors: unknown[] = [];

	for (const step of [...steps].reverse()) {
		try {
			await step();
		} catch (error) {
			errors.push(error);
		}
	}

	return errors;
}

async function rollbackExecuted(
	executed: ExecutedHelper<unknown>[],
	context: DxContext
): Promise<unknown[]> {
	const errors: unknown[] = [];

	for (const entry of [...executed].reverse()) {
		const cleanups = await runCleanup(entry.cleanups);
		errors.push(...cleanups);

		if (entry.helper.rollback) {
			try {
				await entry.helper.rollback(context, entry.state);
			} catch (error) {
				errors.push(error);
			}
		}
	}

	return errors;
}

function combineErrors(
	primary: unknown,
	secondary: readonly unknown[]
): unknown {
	if (secondary.length === 0) {
		return primary;
	}

	return new WPKernelError('DeveloperError', {
		message: 'Readiness rollback reported additional failures.',
		context: {
			original: serialiseUnknown(primary),
			cleanup: secondary.map(serialiseUnknown),
		},
	});
}

function outcomeStatus(
	detection: ReadinessDetection<unknown>,
	confirmation: ReadinessConfirmation<unknown> | undefined,
	performedWork: boolean
): ReadinessOutcomeStatus {
	if (detection.status === 'blocked') {
		return 'blocked';
	}

	if (!confirmation) {
		return 'pending';
	}

	if (confirmation.status === 'ready') {
		return performedWork ? 'updated' : 'ready';
	}

	return 'pending';
}

function normaliseOrder(value: number | undefined): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return Number.POSITIVE_INFINITY;
	}

	return value;
}

export class ReadinessRegistry {
	readonly #helpers = new Map<ReadinessKey, RegisteredHelper>();

	register<State>(helper: ReadinessHelper<State>): void {
		if (this.#helpers.has(helper.key)) {
			throw new WPKernelError('DeveloperError', {
				message: `Readiness helper already registered for ${helper.key}.`,
			});
		}

		const entry: RegisteredHelper = {
			helper: helper as ReadinessHelper<unknown>,
			order: normaliseOrder(helper.metadata.order),
			index: this.#helpers.size,
		};

		this.#helpers.set(helper.key, entry);
	}

	plan(keys: readonly ReadinessKey[]): ReadinessPlan {
		const helpers = keys.map((key) => {
			const entry = this.#helpers.get(key);
			if (!entry) {
				throw new WPKernelError('DeveloperError', {
					message: `Unknown readiness helper: ${key}.`,
				});
			}

			return entry.helper;
		});

		return {
			keys: [...keys],
			run: (context) => this.#runPlan(context, helpers),
		};
	}

	list(): ReadonlyArray<ReadinessHelper<unknown>> {
		return this.#describeInternal().map((entry) => entry.helper);
	}

	describe(): ReadonlyArray<ReadinessHelperDescriptor> {
		return this.#describeInternal().map((entry) => ({
			key: entry.helper.key,
			metadata: entry.helper.metadata,
		}));
	}

	keys(): ReadonlyArray<ReadinessKey> {
		return this.#describeInternal().map((entry) => entry.helper.key);
	}

	#describeInternal(): RegisteredHelper[] {
		return [...this.#helpers.values()].sort((a, b) => {
			if (a.order === b.order) {
				return a.index - b.index;
			}

			return a.order - b.order;
		});
	}

	async #runPlan(
		context: DxContext,
		helpers: readonly ReadinessHelper<unknown>[]
	): Promise<ReadinessRunResult> {
		const outcomes: ReadinessOutcome[] = [];
		const executed: ExecutedHelper<unknown>[] = [];

		for (const helper of helpers) {
			const lifecycleCleanups: (() => Promise<void> | void)[] = [];
			let detection: ReadinessDetection<unknown> | undefined;
			let confirmation: ReadinessConfirmation<unknown> | undefined;
			let state: unknown;
			let performed = false;
			let currentPhase: ReadinessPhase | null = null;
			const helperReporter = context.reporter.child(helper.key);

			try {
				currentPhase = 'detect';
				logPhaseStart(helperReporter, currentPhase);
				detection = await helper.detect(context);
				logDetectionResult(helperReporter, detection);
				state = detection.state;

				if (detection.status === 'blocked') {
					logOutcome(helperReporter, 'blocked', detection, undefined);
					outcomes.push({
						key: helper.key,
						status: 'blocked',
						detection,
					});
					continue;
				}

				if (detection.status === 'pending') {
					const pendingResult = await this.#applyPendingPhases(
						helper,
						context,
						state,
						lifecycleCleanups,
						helperReporter,
						(phase) => {
							currentPhase = phase;
						}
					);
					state = pendingResult.state;
					performed = pendingResult.performedWork;
				}

				currentPhase = 'confirm';
				logPhaseStart(helperReporter, currentPhase);
				confirmation = await helper.confirm(context, state);
				logConfirmationResult(helperReporter, confirmation);
				const status = outcomeStatus(
					detection,
					confirmation,
					performed
				);
				logOutcome(helperReporter, status, detection, confirmation);

				outcomes.push({
					key: helper.key,
					status,
					detection,
					confirmation,
				});

				executed.push({
					helper,
					state,
					cleanups: lifecycleCleanups,
				});
			} catch (error) {
				const failedPhase = currentPhase ?? 'detect';
				logPhaseFailure(helperReporter, failedPhase, error);
				helperReporter.error('Readiness helper failed.', {
					error: serialiseUnknown(error),
				});
				logOutcome(helperReporter, 'failed', detection, confirmation);
				const currentCleanupErrors =
					await runCleanup(lifecycleCleanups);
				const rollbackErrors = await this.#runRollback(
					helper,
					context,
					state
				);

				const executedCleanupErrors = await rollbackExecuted(
					executed,
					context
				);
				const combinedError = combineErrors(
					error,
					currentCleanupErrors
						.concat(rollbackErrors)
						.concat(executedCleanupErrors)
				);

				outcomes.push({
					key: helper.key,
					status: 'failed',
					detection,
					confirmation,
					error: combinedError,
				});

				return {
					outcomes,
					error: combinedError,
				};
			}
		}

		return { outcomes };
	}

	async #runRollback(
		helper: ReadinessHelper<unknown>,
		context: DxContext,
		state: unknown
	): Promise<unknown[]> {
		if (!helper.rollback) {
			return [];
		}

		try {
			await helper.rollback(context, state);
			return [];
		} catch (error) {
			return [error];
		}
	}

	async #applyPendingPhases(
		helper: ReadinessHelper<unknown>,
		context: DxContext,
		initialState: unknown,
		cleanups: (() => Promise<void> | void)[],
		reporter: Reporter,
		setPhase: (phase: ReadinessPhase) => void
	): Promise<{ state: unknown; performedWork: boolean }> {
		let currentState = initialState;
		let performed = false;

		if (helper.prepare) {
			setPhase('prepare');
			logPhaseStart(reporter, 'prepare');
			const prepareResult = await helper.prepare(context, currentState);
			currentState = prepareResult.state;
			if (prepareResult.cleanup) {
				cleanups.push(prepareResult.cleanup);
			}
			performed = true;
			logPhaseSuccess(reporter, 'prepare');
		}

		if (helper.execute) {
			setPhase('execute');
			logPhaseStart(reporter, 'execute');
			const executeResult = await helper.execute(context, currentState);
			currentState = executeResult.state;
			if (executeResult.cleanup) {
				cleanups.push(executeResult.cleanup);
			}
			performed = true;
			logPhaseSuccess(reporter, 'execute');
		}

		return { state: currentState, performedWork: performed };
	}
}

export function createReadinessRegistry(): ReadinessRegistry {
	return new ReadinessRegistry();
}
