import type { MaybePromise } from '../types';

type PipelineTask = () => MaybePromise<void> | void;

type TaskInput = PipelineTask | undefined | null;

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

export function buildPipelineCommit(
	...tasks: readonly TaskInput[]
): (() => MaybePromise<void>) | undefined {
	const normalised = normaliseTasks(tasks);
	if (normalised.length === 0) {
		return undefined;
	}

	return () => runSequential(normalised);
}

export function buildPipelineRollback(
	...tasks: readonly TaskInput[]
): (() => MaybePromise<void>) | undefined {
	const normalised = normaliseTasks(tasks);
	if (normalised.length === 0) {
		return undefined;
	}

	const reversed = [...normalised].reverse();
	return () => runSequential(reversed);
}
