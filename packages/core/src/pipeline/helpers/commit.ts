import type { MaybePromise } from '@wpkernel/pipeline';
/**
 * @typedef {Function} PipelineTask
 * A function representing a single task within a pipeline.
 *
 * It can be synchronous or asynchronous (returning a Promise).
 *
 * @public
 */
export type PipelineTask = () => MaybePromise<void> | void;

/**
 * @typedef {Function | undefined | null} TaskInput
 * Represents a single task that can be part of a pipeline's commit or rollback sequence.
 *
 * A task can be a function that returns a Promise or void, or it can be undefined or null.
 *
 * @public
 */
export type TaskInput = PipelineTask | undefined | null;

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as PromiseLike<T>).then === 'function'
	);
}

function runSequential(tasks: readonly PipelineTask[]): MaybePromise<void> {
	let index = 0;

	const iterate = (): MaybePromise<void> | void => {
		for (; index < tasks.length; index += 1) {
			const result = tasks[index]!();
			if (isPromiseLike(result)) {
				index += 1;
				return result.then(() => iterate());
			}
		}
	};

	return iterate();
}

function normaliseTasks(inputs: readonly TaskInput[]): PipelineTask[] {
	return inputs.filter(Boolean) as PipelineTask[];
}

/**
 * Creates a commit function that runs a sequence of tasks.
 *
 * @param    tasks - The tasks to run on commit.
 * @returns A function that runs the tasks, or undefined if no tasks are provided.
 * @category Pipeline
 */
export function createPipelineCommit(
	...tasks: readonly TaskInput[]
): (() => MaybePromise<void>) | undefined {
	const normalised = normaliseTasks(tasks);
	if (normalised.length === 0) {
		return undefined;
	}

	return () => runSequential(normalised);
}

/**
 * Creates a rollback function that runs a sequence of tasks in reverse order.
 *
 * @param    tasks - The tasks to run on rollback.
 * @returns A function that runs the tasks, or undefined if no tasks are provided.
 * @category Pipeline
 */
export function createPipelineRollback(
	...tasks: readonly TaskInput[]
): (() => MaybePromise<void>) | undefined {
	const normalised = normaliseTasks(tasks);
	if (normalised.length === 0) {
		return undefined;
	}

	const reversed = [...normalised].reverse();
	return () => runSequential(reversed);
}
