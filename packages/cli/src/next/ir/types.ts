import { KernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuildIrOptions,
	IRBlock,
	IRDiagnostic,
	IRPolicyHint,
	IRPolicyMap,
	IRPhpProject,
	IRResource,
	IRSchema,
	IRv1,
} from '../../ir/types';
import type { Helper, HelperApplyOptions } from '@wpkernel/core/pipeline';
import type { PipelineContext } from '../runtime/types';

export interface MutableIr {
	meta: IRv1['meta'] | null;
	readonly config: IRv1['config'];
	schemas: IRSchema[];
	resources: IRResource[];
	policies: IRPolicyHint[];
	policyMap: IRPolicyMap | null;
	blocks: IRBlock[];
	php: IRPhpProject | null;
	diagnostics: IRDiagnostic[];
	extensions: Record<string, unknown>;
}

export function createIrDraft(options: BuildIrOptions): MutableIr {
	return {
		meta: null,
		config: options.config,
		schemas: [],
		resources: [],
		policies: [],
		policyMap: null,
		blocks: [],
		php: null,
		diagnostics: [],
		extensions: Object.create(null),
	};
}

export function finalizeIrDraft(draft: MutableIr): IRv1 {
	if (!draft.meta) {
		throw new KernelError('ValidationError', {
			message:
				'IR meta fragment did not set metadata before pipeline completion.',
		});
	}

	if (!draft.policyMap) {
		throw new KernelError('ValidationError', {
			message:
				'IR policy map fragment did not resolve policy map before pipeline completion.',
		});
	}

	if (!draft.php) {
		throw new KernelError('ValidationError', {
			message:
				'IR PHP fragment did not configure PHP project before pipeline completion.',
		});
	}

	const diagnostics =
		draft.diagnostics.length > 0 ? draft.diagnostics.slice() : undefined;

	return {
		meta: draft.meta,
		config: draft.config,
		schemas: draft.schemas,
		resources: draft.resources,
		policies: draft.policies,
		policyMap: draft.policyMap,
		blocks: draft.blocks,
		php: draft.php,
		diagnostics,
	};
}

export interface IrFragmentInput {
	readonly options: BuildIrOptions;
	readonly draft: MutableIr;
}

export interface IrFragmentOutput {
	readonly draft: MutableIr;
	assign: (partial: Partial<MutableIr>) => void;
}

export function createIrFragmentOutput(draft: MutableIr): IrFragmentOutput {
	return {
		draft,
		assign(partial) {
			if (partial.meta) {
				draft.meta = partial.meta;
			}
			if (partial.schemas) {
				draft.schemas = partial.schemas;
			}
			if (partial.resources) {
				draft.resources = partial.resources;
			}
			if (partial.policies) {
				draft.policies = partial.policies;
			}
			if (partial.policyMap) {
				draft.policyMap = partial.policyMap;
			}
			if (partial.blocks) {
				draft.blocks = partial.blocks;
			}
			if (partial.php) {
				draft.php = partial.php;
			}
			if (partial.diagnostics) {
				draft.diagnostics = partial.diagnostics;
			}
			if (partial.extensions) {
				draft.extensions = partial.extensions;
			}
		},
	};
}

export type IrFragment = Helper<
	PipelineContext,
	IrFragmentInput,
	IrFragmentOutput,
	PipelineContext['reporter'],
	'fragment'
>;

export type IrFragmentApplyOptions = HelperApplyOptions<
	PipelineContext,
	IrFragmentInput,
	IrFragmentOutput,
	PipelineContext['reporter']
> & {
	reporter: Reporter;
};

export type { IRDiagnostic, IRDiagnosticSeverity } from '../../ir/types';
