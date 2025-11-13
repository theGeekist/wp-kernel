import path from 'node:path';
import {
	createPipeline as createCorePipeline,
	createHelper,
} from '@wpkernel/pipeline';
import type {
	PipelineDiagnostic,
	PipelineRunState,
	Helper,
} from '@wpkernel/pipeline';
import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import { resolveDependencyVersions } from './dependency-versions';
import {
	assertNoCollisions,
	buildPathsReplacement,
	buildReplacementMap,
	buildScaffoldDescriptors,
} from './scaffold';
import {
	parseStringOption,
	shouldPreferRegistryVersions,
	slugify,
	fileExists,
} from './utils';
import {
	createEmptyPluginDetection,
	detectExistingPlugin,
	buildSkipSet,
} from './plugin-detection';
import {
	applyInitWrites,
	buildWorkflowResult,
	logDependencyResolution,
} from './workflow-support';
import {
	DEFAULT_COMPOSER_INSTALL_BUDGET_MS,
	DEFAULT_NODE_INSTALL_BUDGET_MS,
	measureStage,
	resolveInstallBudgets,
} from './timing';
import type {
	InitPipelineArtifact,
	InitPipelineContext,
	InitPipelineDraft,
	InitPipelineRunOptions,
	InitWorkflowResult,
	InstallationMeasurements,
} from './types';

const INIT_FRAGMENT_KEY_NAMESPACE = 'init.namespace';
const INIT_FRAGMENT_KEY_DETECT = 'init.detect';
const INIT_FRAGMENT_KEY_COLLISIONS = 'init.collisions';
const INIT_FRAGMENT_KEY_DEPENDENCIES = 'init.dependencies';
const INIT_BUILDER_KEY_SCAFFOLD = 'init.scaffold';
const INIT_BUILDER_KEY_INSTALL = 'init.install';
const INIT_BUILDER_KEY_RESULT = 'init.result';
type InitFragmentHelper = Helper<
	InitPipelineContext,
	void,
	InitPipelineDraft,
	Reporter,
	'fragment'
>;

type InitBuilderHelper = Helper<
	InitPipelineContext,
	InitPipelineArtifact,
	InitPipelineArtifact,
	Reporter,
	'builder'
>;

export function createInitPipeline() {
	const pipeline = createCorePipeline<
		InitPipelineRunOptions,
		InitPipelineRunOptions,
		InitPipelineContext,
		Reporter,
		InitPipelineDraft,
		InitPipelineArtifact,
		PipelineDiagnostic,
		PipelineRunState<InitWorkflowResult, PipelineDiagnostic>,
		void,
		InitPipelineDraft,
		InitPipelineArtifact,
		InitPipelineArtifact,
		'fragment',
		'builder',
		InitFragmentHelper,
		InitBuilderHelper
	>({
		createBuildOptions: (options) => options,
		createContext: (options) => ({
			workspace: options.workspace,
			reporter: options.reporter,
			options,
		}),
		createFragmentState: () => ({ summaries: [] }),
		createFragmentArgs: ({ context, draft }) => ({
			context,
			input: undefined,
			output: draft,
			reporter: context.reporter,
		}),
		finalizeFragmentState: ({ draft }) => finalizeDraft(draft),
		createBuilderArgs: ({ context, artifact }) => ({
			context,
			input: artifact,
			output: artifact,
			reporter: context.reporter,
		}),
		createRunResult: ({ artifact, diagnostics, steps }) => {
			if (!artifact.result) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Init pipeline completed without producing a workflow result.',
				});
			}

			return {
				artifact: artifact.result,
				diagnostics,
				steps,
			};
		},
	});

	pipeline.ir.use(createNamespaceHelper());
	pipeline.ir.use(createDetectionHelper());
	pipeline.ir.use(createCollisionHelper());
	pipeline.ir.use(createDependencyHelper());
	pipeline.builders.use(createScaffoldBuilder());
	pipeline.builders.use(createInstallBuilder());
	pipeline.builders.use(createResultBuilder());

	return pipeline;
}

export async function runInitPipeline(
	options: InitPipelineRunOptions
): Promise<InitWorkflowResult> {
	const pipeline = createInitPipeline();
	const result = await pipeline.run(options);
	return result.artifact;
}

function createNamespaceHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_NAMESPACE,
		kind: 'fragment',
		mode: 'override',
		apply({ context, output }) {
			const namespace = slugify(
				parseStringOption(context.options.projectName) ??
				path.basename(context.workspace.root)
			);

			output.namespace = namespace;
			output.templateName = context.options.template ?? 'plugin';
			output.scaffoldFiles = buildScaffoldDescriptors(namespace);
		},
	});
}

function createDetectionHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_DETECT,
		kind: 'fragment',
		dependsOn: [INIT_FRAGMENT_KEY_NAMESPACE],
		apply: async ({ context, output }) => {
			const force = context.options.force === true;
			if (force) {
				output.pluginDetection = createEmptyPluginDetection();
				return;
			}

			const descriptors = output.scaffoldFiles ?? [];
			output.pluginDetection = await detectExistingPlugin({
				workspace: context.workspace,
				descriptors,
			});
		},
	});
}

function createCollisionHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_COLLISIONS,
		kind: 'fragment',
		dependsOn: [INIT_FRAGMENT_KEY_DETECT],
		apply: async ({ context, output }) => {
			const descriptors = output.scaffoldFiles ?? [];
			const detection =
				output.pluginDetection ?? createEmptyPluginDetection();
			const { skipped } = await assertNoCollisions({
				workspace: context.workspace,
				files: descriptors,
				force: context.options.force === true,
				skippableTargets: detection.skipTargets,
			});

			output.skipSet = buildSkipSet({
				force: context.options.force === true,
				collisionSkips: skipped,
				pluginDetection: detection,
			});
		},
	});
}

function createDependencyHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_DEPENDENCIES,
		kind: 'fragment',
		dependsOn: [INIT_FRAGMENT_KEY_COLLISIONS],
		apply: async ({ context, output, reporter }) => {
			const preferRegistryVersions = shouldPreferRegistryVersions({
				cliFlag: context.options.preferRegistryVersionsFlag === true,
				env: context.options.env?.WPK_PREFER_REGISTRY_VERSIONS,
			});

			const dependencyResolution = await resolveDependencyVersions(
				context.workspace.root,
				{
					preferRegistryVersions,
					registryUrl: context.options.env?.REGISTRY_URL,
				}
			);

			logDependencyResolution({
				reporter,
				verbose: context.options.verbose === true,
				source: dependencyResolution.source,
			});

			const tsconfigReplacements = await buildPathsReplacement(
				context.workspace.root
			);
			output.dependencyResolution = dependencyResolution;
			output.replacements = buildReplacementMap(tsconfigReplacements);
		},
	});
}

function createScaffoldBuilder(): InitBuilderHelper {
	return createHelper({
		key: INIT_BUILDER_KEY_SCAFFOLD,
		kind: 'builder',
		apply: async ({ context, input, output, reporter }) => {
			context.workspace.begin('init');

			try {
				const summaries = await applyInitWrites({
					workspace: context.workspace,
					scaffoldFiles: input.scaffoldFiles,
					replacements: input.replacements,
					force: context.options.force === true,
					skipSet: input.skipSet,
					namespace: input.namespace,
					dependencyResolution: input.dependencyResolution,
					reporter,
					pluginDetection: input.pluginDetection,
				});

				const manifest = await context.workspace.commit('init');
				output.summaries = summaries;
				output.manifest = manifest;
			} catch (error) {
				await context.workspace.rollback('init').catch(() => undefined);
				throw error;
			}
		},
	});
}

function createInstallBuilder(): InitBuilderHelper {
	return createHelper({
		key: INIT_BUILDER_KEY_INSTALL,
		kind: 'builder',
		dependsOn: [INIT_BUILDER_KEY_SCAFFOLD],
		async apply({ context, input, output, reporter }) {
			if (!context.options.installDependencies) {
				return;
			}

			const budgets = resolveInstallBudgets(context.options.env);
			const installers = context.options.installers;
			const existingInstallations: InstallationMeasurements =
				output.installations ?? {};

			reporter.info('Installing npm dependencies...');
			const npmMeasurement = await measureStage({
				stage: 'init.install.npm',
				label: 'Installing npm dependencies',
				budgetMs: budgets.npm ?? DEFAULT_NODE_INSTALL_BUDGET_MS,
				reporter,
				run: () =>
					installers.installNodeDependencies(context.workspace.root),
			});

			let nextInstallations: InstallationMeasurements = {
				...existingInstallations,
				npm: npmMeasurement,
			};

			if (
				await shouldInstallComposer({
					summaries: input.summaries ?? [],
					workspace: context.workspace,
				})
			) {
				reporter.info('Installing composer dependencies...');
				const composerMeasurement = await measureStage({
					stage: 'init.install.composer',
					label: 'Installing composer dependencies',
					budgetMs:
						budgets.composer ?? DEFAULT_COMPOSER_INSTALL_BUDGET_MS,
					reporter,
					run: () =>
						installers.installComposerDependencies(
							context.workspace.root
						),
				});

				nextInstallations = {
					...nextInstallations,
					composer: composerMeasurement,
				};
			}

			output.installations = nextInstallations;
		},
	});
}

function createResultBuilder(): InitBuilderHelper {
	return createHelper({
		key: INIT_BUILDER_KEY_RESULT,
		kind: 'builder',
		dependsOn: [INIT_BUILDER_KEY_INSTALL],
		apply({ input, output }) {
			if (!input.manifest) {
				throw new WPKernelError('DeveloperError', {
					message:
						'Init pipeline expected a manifest after scaffolding.',
				});
			}

			output.result = buildWorkflowResult({
				manifest: input.manifest,
				summaries: input.summaries,
				templateName: input.templateName,
				namespace: input.namespace,
				dependencySource: input.dependencyResolution.source,
				installations: input.installations,
			});
		},
	});
}

function finalizeDraft(draft: InitPipelineDraft): InitPipelineArtifact {
	const namespace = draft.namespace;
	const templateName = draft.templateName;
	const scaffoldFiles = draft.scaffoldFiles;
	const pluginDetection =
		draft.pluginDetection ?? createEmptyPluginDetection();
	const dependencyResolution = draft.dependencyResolution;
	const replacements = draft.replacements;
	const installations = draft.installations;

	if (
		!namespace ||
		!templateName ||
		!scaffoldFiles ||
		!dependencyResolution ||
		!replacements
	) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Init pipeline missing required data after fragment execution.',
		});
	}

	return {
		namespace,
		templateName,
		scaffoldFiles,
		pluginDetection,
		skipSet: draft.skipSet,
		dependencyResolution,
		replacements,
		summaries: draft.summaries,
		manifest: draft.manifest,
		result: draft.result,
		installations,
	} satisfies InitPipelineArtifact;
}

async function shouldInstallComposer({
	summaries,
	workspace,
}: {
	readonly summaries: InitPipelineArtifact['summaries'];
	readonly workspace: InitPipelineContext['workspace'];
}): Promise<boolean> {
	const composerSummary = summaries.find(
		(entry) => entry.path === 'composer.json'
	);

	if (composerSummary && composerSummary.status !== 'skipped') {
		return true;
	}

	return fileExists(workspace, 'composer.json');
}
