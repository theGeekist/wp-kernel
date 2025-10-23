import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { BuildIrOptions, IRv1 } from '../../ir/types';
import { createPipeline } from '../runtime';
import type { PipelinePhase, Pipeline } from '../runtime';
import type { Workspace } from '../workspace';
import { createWorkspace } from '../workspace';
import { createMetaFragment } from './fragments/meta';
import { createSchemasFragment } from './fragments/schemas';
import { createResourcesFragment } from './fragments/resources';
import { createPoliciesFragment } from './fragments/policies';
import { createPolicyMapFragment } from './fragments/policy-map';
import { createBlocksFragment } from './fragments/blocks';
import { createDiagnosticsFragment } from './fragments/diagnostics';
import { createOrderingFragment } from './fragments/ordering';
import { createValidationFragment } from './fragments/validation';
import {
	createBundler,
	createPatcher,
	createPhpBuilder,
	createPhpDriverInstallerHelper,
	createTsBuilder,
} from '../builders';
import { createAdapterExtensionsExtension } from '../runtime/adapterExtensions';

export interface CreateIrEnvironment {
	readonly workspace?: Workspace;
	readonly reporter?: Reporter;
	readonly phase?: PipelinePhase;
	readonly pipeline?: Pipeline;
}

function registerCoreFragments(pipeline: Pipeline): void {
	pipeline.ir.use(createMetaFragment());
	pipeline.ir.use(createSchemasFragment());
	pipeline.ir.use(createResourcesFragment());
	pipeline.ir.use(createPoliciesFragment());
	pipeline.ir.use(createPolicyMapFragment());
	pipeline.ir.use(createDiagnosticsFragment());
	pipeline.ir.use(createBlocksFragment());
	pipeline.ir.use(createOrderingFragment());
	pipeline.ir.use(createValidationFragment());
}

function registerCoreBuilders(pipeline: Pipeline): void {
	pipeline.builders.use(createBundler());
	pipeline.builders.use(createPhpDriverInstallerHelper());
	pipeline.builders.use(createPhpBuilder());
	pipeline.builders.use(createTsBuilder());
	pipeline.builders.use(createPatcher());
}

export async function createIr(
	options: BuildIrOptions,
	environment: CreateIrEnvironment = {}
): Promise<IRv1> {
	const pipeline = environment.pipeline ?? createPipeline();
	registerCoreFragments(pipeline);
	registerCoreBuilders(pipeline);
	pipeline.extensions.use(createAdapterExtensionsExtension());

	const workspace =
		environment.workspace ??
		createWorkspace(path.dirname(options.sourcePath));
	const reporter = environment.reporter ?? createNoopReporter();
	const phase = environment.phase ?? 'generate';

	const { ir } = await pipeline.run({
		phase,
		config: options.config,
		namespace: options.namespace,
		origin: options.origin,
		sourcePath: options.sourcePath,
		workspace,
		reporter,
	});

	return ir;
}

export { registerCoreFragments, registerCoreBuilders };
