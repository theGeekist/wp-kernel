import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import { createNoopReporter as buildNoopReporter } from '@wpkernel/core/reporter';
import type { BuildIrOptions, IRv1 } from './publicTypes';
import { createPipeline } from '../runtime';
import type { PipelinePhase, Pipeline } from '../runtime';
import type { Workspace } from '../workspace';
import { buildWorkspace } from '../workspace';
import { createMetaFragment } from './fragments/meta';
import { createSchemasFragment } from './fragments/schemas';
import { createResourcesFragment } from './fragments/resources';
import { createCapabilitiesFragment } from './fragments/capabilities';
import { createCapabilityMapFragment } from './fragments/capability-map';
import { createBlocksFragment } from './fragments/blocks';
import { createDiagnosticsFragment } from './fragments/diagnostics';
import { createOrderingFragment } from './fragments/ordering';
import { createValidationFragment } from './fragments/validation';
import {
	createApplyPlanBuilder,
	createBundler,
	createJsBlocksBuilder,
	createPatcher,
	createPhpBuilder,
	createPhpDriverInstaller,
	createTsBuilder,
} from '../builders';
import { buildAdapterExtensionsExtension } from '../runtime/adapterExtensions';
import { buildEmptyGenerationState } from '../apply/manifest';

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
	pipeline.ir.use(createCapabilitiesFragment());
	pipeline.ir.use(createCapabilityMapFragment());
	pipeline.ir.use(createDiagnosticsFragment());
	pipeline.ir.use(createBlocksFragment());
	pipeline.ir.use(createOrderingFragment());
	pipeline.ir.use(createValidationFragment());
}

function registerCoreBuilders(pipeline: Pipeline): void {
	pipeline.builders.use(createBundler());
	pipeline.builders.use(createPhpDriverInstaller());
	pipeline.builders.use(createPhpBuilder());
	pipeline.builders.use(createApplyPlanBuilder());
	pipeline.builders.use(createJsBlocksBuilder());
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
	pipeline.extensions.use(buildAdapterExtensionsExtension());

	const workspace =
		environment.workspace ??
		buildWorkspace(path.dirname(options.sourcePath));
	const reporter = environment.reporter ?? buildNoopReporter();
	const phase = environment.phase ?? 'generate';

	const { ir } = await pipeline.run({
		phase,
		config: options.config,
		namespace: options.namespace,
		origin: options.origin,
		sourcePath: options.sourcePath,
		workspace,
		reporter,
		generationState: buildEmptyGenerationState(),
	});

	return ir;
}

export { registerCoreFragments, registerCoreBuilders };
