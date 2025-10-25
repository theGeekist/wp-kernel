import type { Reporter } from '@wpkernel/core/reporter';
import type { BuildIrOptions, IRv1 } from '../../ir/types';
import type { Helper, HelperDescriptor } from '@wpkernel/core/pipeline';
import type { MutableIr } from '../ir/types';
import type { Workspace } from '../workspace/types';

export type PipelinePhase = 'init' | 'generate' | 'apply' | `custom:${string}`;

export interface PipelineContext {
	readonly workspace: Workspace;
	readonly phase: PipelinePhase;
	readonly reporter: Reporter;
}

export interface PipelineRunOptions {
	readonly phase: PipelinePhase;
	readonly config: BuildIrOptions['config'];
	readonly namespace: string;
	readonly origin: string;
	readonly sourcePath: string;
	readonly workspace: Workspace;
	readonly reporter: Reporter;
}

export interface PipelineStep extends HelperDescriptor {
	readonly id: string;
	readonly index: number;
}

export interface ConflictDiagnostic {
	readonly type: 'conflict';
	readonly key: string;
	readonly mode: HelperDescriptor['mode'];
	readonly helpers: readonly string[];
	readonly message: string;
}

export type PipelineDiagnostic = ConflictDiagnostic;

export interface PipelineRunResult {
	readonly ir: IRv1;
	readonly diagnostics: readonly PipelineDiagnostic[];
	readonly steps: readonly PipelineStep[];
}

export type FragmentHelper = Helper<
	PipelineContext,
	FragmentInput,
	FragmentOutput,
	PipelineContext['reporter'],
	'fragment'
>;

export interface FragmentInput {
	readonly options: BuildIrOptions;
	readonly draft: MutableIr;
}

export interface FragmentOutput {
	readonly draft: MutableIr;
	assign: (partial: Partial<MutableIr>) => void;
}

export interface BuilderInput {
	readonly phase: PipelinePhase;
	readonly options: BuildIrOptions;
	readonly ir: IRv1 | null;
}

export interface BuilderWriteAction {
	readonly file: string;
	readonly contents: Buffer | string;
}

export interface BuilderOutput {
	readonly actions: BuilderWriteAction[];
	queueWrite: (action: BuilderWriteAction) => void;
}

export type BuilderHelper = Helper<
	PipelineContext,
	BuilderInput,
	BuilderOutput,
	PipelineContext['reporter'],
	'builder'
>;

export interface PipelineExtensionHookOptions {
	readonly context: PipelineContext;
	readonly options: BuildIrOptions;
	readonly artifact: IRv1;
}

export interface PipelineExtensionHookResult {
	readonly artifact?: IRv1;
	readonly commit?: () => Promise<void>;
	readonly rollback?: () => Promise<void>;
}

export type PipelineExtensionHook = (
	options: PipelineExtensionHookOptions
) => Promise<PipelineExtensionHookResult | void>;

export interface PipelineExtension {
	readonly key?: string;
	register: (
		pipeline: Pipeline
	) => void | PipelineExtensionHook | Promise<void | PipelineExtensionHook>;
}

export interface Pipeline {
	readonly ir: {
		use: (helper: FragmentHelper) => void;
	};
	readonly builders: {
		use: (helper: BuilderHelper) => void;
	};
	readonly extensions: {
		use: (extension: PipelineExtension) => unknown | Promise<unknown>;
	};
	use: (helper: FragmentHelper | BuilderHelper) => void;
	run: (options: PipelineRunOptions) => Promise<PipelineRunResult>;
}

export type FragmentApplyOptions = Parameters<FragmentHelper['apply']>[0];
export type FragmentNext = Parameters<FragmentHelper['apply']>[1];
export type BuilderApplyOptions = Parameters<BuilderHelper['apply']>[0];
export type BuilderNext = Parameters<BuilderHelper['apply']>[1];
