import type { Reporter } from '../reporter/types';
import type { CreateHelperOptions, Helper, HelperKind } from './types';

export function createHelper<
	TContext,
	TInput,
	TOutput,
	TReporter extends Reporter = Reporter,
	TKind extends HelperKind = HelperKind,
>(
	options: CreateHelperOptions<TContext, TInput, TOutput, TReporter, TKind>
): Helper<TContext, TInput, TOutput, TReporter, TKind> {
	const {
		key,
		kind,
		mode = 'extend',
		priority = 0,
		dependsOn = [],
		origin,
		apply,
	} = options;

	const descriptor: Helper<TContext, TInput, TOutput, TReporter, TKind> =
		Object.freeze({
			key,
			kind,
			mode,
			priority,
			dependsOn: Array.from(dependsOn),
			origin,
			apply(
				runtimeOptions: Parameters<
					Helper<TContext, TInput, TOutput, TReporter, TKind>['apply']
				>[0],
				next?: () => Promise<void>
			) {
				return apply(runtimeOptions, next);
			},
		});

	return descriptor;
}
