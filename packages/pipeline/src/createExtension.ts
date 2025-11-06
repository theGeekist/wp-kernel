import { isPromiseLike } from './async-utils.js';
import type {
	MaybePromise,
	PipelineExtension,
	PipelineExtensionHook,
} from './types.js';

interface CreatePipelineExtensionBaseOptions {
	readonly key?: string;
}

interface CreatePipelineExtensionWithRegister<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
> extends CreatePipelineExtensionBaseOptions {
	readonly register: (
		pipeline: TPipeline
	) => MaybePromise<void | PipelineExtensionHook<
		TContext,
		TOptions,
		TArtifact
	>>;
}

interface CreatePipelineExtensionWithSetup<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
> extends CreatePipelineExtensionBaseOptions {
	readonly setup?: (pipeline: TPipeline) => MaybePromise<void>;
	readonly hook?: PipelineExtensionHook<TContext, TOptions, TArtifact>;
}

export type CreatePipelineExtensionOptions<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
> =
	| CreatePipelineExtensionWithRegister<
			TPipeline,
			TContext,
			TOptions,
			TArtifact
	  >
	| CreatePipelineExtensionWithSetup<
			TPipeline,
			TContext,
			TOptions,
			TArtifact
	  >;

/**
 * Creates a pipeline extension with optional setup and hook registration helpers.
 *
 * @param options
 * @example
 * ```ts
 * const extension = createPipelineExtension({
 *   key: 'acme.adapters.audit',
 *   setup(pipeline) {
 *     pipeline.builders.use(createAuditBuilder());
 *   },
 *   hook({ artifact }) {
 *     return {
 *       artifact: {
 *         ...artifact,
 *         meta: { ...artifact.meta, audited: true },
 *       },
 *     };
 *   },
 * });
 * ```
 */
export function createPipelineExtension<
	TPipeline,
	TContext,
	TOptions,
	TArtifact,
>(
	options: CreatePipelineExtensionOptions<
		TPipeline,
		TContext,
		TOptions,
		TArtifact
	>
): PipelineExtension<TPipeline, TContext, TOptions, TArtifact> {
	if ('register' in options) {
		return {
			key: options.key,
			register: options.register,
		} satisfies PipelineExtension<TPipeline, TContext, TOptions, TArtifact>;
	}

	const { key, setup, hook } = options;

	return {
		key,
		register(pipeline) {
			const setupResult = setup?.(pipeline);

			if (setupResult && isPromiseLike(setupResult)) {
				return setupResult.then(() => hook);
			}

			return hook;
		},
	} satisfies PipelineExtension<TPipeline, TContext, TOptions, TArtifact>;
}
