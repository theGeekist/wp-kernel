import { WPKernelError } from '@wpkernel/core/error';
import { serializeWPKernelError } from '@wpkernel/core/contracts';
import type { DxContext } from '../context';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
	ReadinessKey,
	ReadinessOutcome,
	ReadinessOutcomeStatus,
	ReadinessPlan,
	ReadinessRunResult,
} from './types';

interface ExecutedHelper<State> {
	readonly helper: ReadinessHelper<State>;
	readonly state: State;
	readonly cleanups: readonly (() => Promise<void> | void)[];
}

function serialiseUnknown(error: unknown) {
	if (WPKernelError.isWPKernelError(error)) {
		return serializeWPKernelError(error);
	}

	if (error instanceof Error) {
		return serializeWPKernelError(WPKernelError.wrap(error));
	}

	return serializeWPKernelError(
		new WPKernelError('UnknownError', {
			message: 'Unexpected error during readiness orchestration.',
			data: { value: error },
		})
	);
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

export class ReadinessRegistry {
	readonly #helpers = new Map<ReadinessKey, ReadinessHelper<unknown>>();

	register<State>(helper: ReadinessHelper<State>): void {
		if (this.#helpers.has(helper.key)) {
			throw new WPKernelError('DeveloperError', {
				message: `Readiness helper already registered for ${helper.key}.`,
			});
		}

		this.#helpers.set(helper.key, helper as ReadinessHelper<unknown>);
	}

	plan(keys: readonly ReadinessKey[]): ReadinessPlan {
		const helpers = keys.map((key) => {
			const entry = this.#helpers.get(key);
			if (!entry) {
				throw new WPKernelError('DeveloperError', {
					message: `Unknown readiness helper: ${key}.`,
				});
			}

			return entry;
		});

		return {
			keys: [...keys],
			run: (context) => this.#runPlan(context, helpers),
		};
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

			try {
				detection = await helper.detect(context);
				state = detection.state;

				if (detection.status === 'blocked') {
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
						lifecycleCleanups
					);
					state = pendingResult.state;
					performed = pendingResult.performedWork;
				}

				confirmation = await helper.confirm(context, state);
				const status = outcomeStatus(
					detection,
					confirmation,
					performed
				);

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
		cleanups: (() => Promise<void> | void)[]
	): Promise<{ state: unknown; performedWork: boolean }> {
		let currentState = initialState;
		let performed = false;

		if (helper.prepare) {
			const prepareResult = await helper.prepare(context, currentState);
			currentState = prepareResult.state;
			if (prepareResult.cleanup) {
				cleanups.push(prepareResult.cleanup);
			}
			performed = true;
		}

		if (helper.execute) {
			const executeResult = await helper.execute(context, currentState);
			currentState = executeResult.state;
			if (executeResult.cleanup) {
				cleanups.push(executeResult.cleanup);
			}
			performed = true;
		}

		return { state: currentState, performedWork: performed };
	}
}

export function createReadinessRegistry(): ReadinessRegistry {
	return new ReadinessRegistry();
}
