import type { Reporter } from '@wpkernel/core/reporter';

export type HelperKind = 'fragment' | 'builder';
export type HelperMode = 'extend' | 'override' | 'merge';

export interface HelperApplyOptions<TContext, TInput, TOutput> {
	readonly context: TContext;
	readonly input: TInput;
	readonly output: TOutput;
	readonly reporter: Reporter;
}

export type HelperApplyFn<TContext, TInput, TOutput> = (
	options: HelperApplyOptions<TContext, TInput, TOutput>,
	next?: () => Promise<void>
) => Promise<void> | void;

export interface HelperDescriptor {
	readonly key: string;
	readonly kind: HelperKind;
	readonly mode: HelperMode;
	readonly priority: number;
	readonly dependsOn: readonly string[];
	readonly origin?: string;
}

export interface Helper<TContext, TInput, TOutput> extends HelperDescriptor {
	readonly apply: HelperApplyFn<TContext, TInput, TOutput>;
}

export interface CreateHelperOptions<TContext, TInput, TOutput> {
	readonly key: string;
	readonly kind: HelperKind;
	readonly mode?: HelperMode;
	readonly priority?: number;
	readonly dependsOn?: readonly string[];
	readonly origin?: string;
	readonly apply: HelperApplyFn<TContext, TInput, TOutput>;
}

export function createHelper<TContext, TInput, TOutput>(
	options: CreateHelperOptions<TContext, TInput, TOutput>
): Helper<TContext, TInput, TOutput> {
	const {
		key,
		kind,
		mode = 'extend',
		priority = 0,
		dependsOn = [],
		origin,
		apply,
	} = options;

	const descriptor: Helper<TContext, TInput, TOutput> = Object.freeze({
		key,
		kind,
		mode,
		priority,
		dependsOn: Array.from(dependsOn),
		origin,
		apply: async (
			runtimeOptions: HelperApplyOptions<TContext, TInput, TOutput>,
			next?: () => Promise<void>
		) => {
			await apply(runtimeOptions, next);
		},
	});

	return descriptor;
}
