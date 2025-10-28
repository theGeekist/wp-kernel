import type { CreateHelperOptions, Helper } from '@wpkernel/core/pipeline';
import { createHelper } from '@wpkernel/core/pipeline';
import type { Reporter } from '@wpkernel/core/reporter';

export interface BuildPipelineExtensionOptions<
	TRegister extends (...args: unknown[]) => unknown = (
		...args: unknown[]
	) => unknown,
> {
	readonly key?: string;
	readonly register?: TRegister;
}

export function buildFragmentHelper<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter,
	TKind extends string = 'fragment',
>(
	options: Omit<
		CreateHelperOptions<TContext, TInput, TOutput, TReporter, TKind>,
		'kind'
	> & {
		readonly kind?: TKind;
	}
): Helper<TContext, TInput, TOutput, TReporter, TKind> {
	return createHelper({
		...options,
		kind: options.kind ?? ('fragment' as TKind),
	});
}

export function buildBuilderHelper<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter,
	TKind extends string = 'builder',
>(
	options: Omit<
		CreateHelperOptions<TContext, TInput, TOutput, TReporter, TKind>,
		'kind'
	> & {
		readonly kind?: TKind;
	}
): Helper<TContext, TInput, TOutput, TReporter, TKind> {
	return createHelper({
		...options,
		kind: options.kind ?? ('builder' as TKind),
	});
}

export function buildPipelineExtension<
	TRegister extends (...args: unknown[]) => unknown = () => void,
>({ key, register }: BuildPipelineExtensionOptions<TRegister> = {}): {
	readonly key?: string;
	readonly register: TRegister;
} {
	return {
		key,
		register: register ?? (((): unknown => undefined) as TRegister),
	};
}
