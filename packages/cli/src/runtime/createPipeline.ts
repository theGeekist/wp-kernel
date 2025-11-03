import { createPipeline as createCorePipeline } from '@wpkernel/core/pipeline';
import type { BuildIrOptions } from '../ir/publicTypes';
import {
	buildIrDraft,
	buildIrFragmentOutput,
	finalizeIrDraft,
	type MutableIr,
} from '../ir/types';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	FragmentHelper,
	FragmentInput,
	FragmentOutput,
	Pipeline,
	PipelineContext,
	PipelineDiagnostic,
	PipelineExtensionHookOptions,
	PipelineRunOptions,
	PipelineRunResult,
} from './types';

function buildBuilderOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite(action) {
			actions.push(action);
		},
	};
}

function mapRunOptionsToBuildOptions(
	options: PipelineRunOptions
): BuildIrOptions {
	return {
		config: options.config,
		namespace: options.namespace,
		origin: options.origin,
		sourcePath: options.sourcePath,
	} satisfies BuildIrOptions;
}

export function createPipeline(): Pipeline {
	return createCorePipeline<
		PipelineRunOptions,
		BuildIrOptions,
		PipelineContext,
		PipelineContext['reporter'],
		MutableIr,
		PipelineRunResult['ir'],
		PipelineDiagnostic,
		PipelineRunResult,
		FragmentInput,
		FragmentOutput,
		BuilderInput,
		BuilderOutput,
		FragmentHelper['kind'],
		BuilderHelper['kind'],
		FragmentHelper,
		BuilderHelper
	>({
		createBuildOptions: mapRunOptionsToBuildOptions,
		createContext(runOptions) {
			return {
				workspace: runOptions.workspace,
				reporter: runOptions.reporter,
				phase: runOptions.phase,
				generationState: runOptions.generationState,
			} satisfies PipelineContext;
		},
		createFragmentState({ buildOptions }) {
			return buildIrDraft(buildOptions);
		},
		createFragmentArgs({ context, buildOptions, draft }) {
			return {
				context,
				input: {
					options: buildOptions,
					draft,
				},
				output: buildIrFragmentOutput(draft),
				reporter: context.reporter,
			} satisfies Parameters<FragmentHelper['apply']>[0];
		},
		finalizeFragmentState({ draft, helpers }) {
			return finalizeIrDraft(draft, helpers);
		},
		createBuilderArgs({ context, buildOptions, artifact }) {
			return {
				context,
				input: {
					phase: context.phase,
					options: buildOptions,
					ir: artifact,
				},
				output: buildBuilderOutput(),
				reporter: context.reporter,
			} satisfies Parameters<BuilderHelper['apply']>[0];
		},
		createRunResult({ artifact, diagnostics, steps }) {
			return {
				ir: artifact,
				diagnostics,
				steps,
			} satisfies PipelineRunResult;
		},
		createExtensionHookOptions({ context, buildOptions, artifact }) {
			return {
				context,
				options: buildOptions,
				artifact,
			} satisfies PipelineExtensionHookOptions;
		},
		onExtensionRollbackError({ error, extensionKeys, context }) {
			context.reporter.warn('Pipeline extension rollback failed.', {
				error: (error as Error).message,
				extensions: extensionKeys,
			});
		},
		createConflictDiagnostic({ helper, existing, message }) {
			return {
				type: 'conflict',
				key: helper.key,
				mode: 'override',
				helpers: [
					existing.origin ?? existing.key,
					helper.origin ?? helper.key,
				],
				message,
			} satisfies PipelineDiagnostic;
		},
	}) as Pipeline;
}
