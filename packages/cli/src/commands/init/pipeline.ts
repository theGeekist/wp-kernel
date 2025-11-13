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
	resolveInstallBudgets,
} from './timing';
import { measureStageWithProgress } from '../../utils/progress';
import type {
	InitPipelineArtifact,
	InitPipelineContext,
	InitPipelineDraft,
	InitPipelineRunOptions,
	InitWorkflowResult,
	InstallationMeasurements,
	ScaffoldSummary,
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
		apply({ context, output, reporter }) {
			reporter.info('Preparing project namespace and template...');

			const namespace = slugify(
				parseStringOption(context.options.projectName) ??
					path.basename(context.workspace.root)
			);
			const templateName = context.options.template ?? 'plugin';

			output.namespace = namespace;
			output.templateName = templateName;
			output.scaffoldFiles = buildScaffoldDescriptors(namespace);

			reporter.info(
				`Using namespace "${namespace}" with the ${templateName} template.`
			);
		},
	});
}

function createDetectionHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_DETECT,
		kind: 'fragment',
		dependsOn: [INIT_FRAGMENT_KEY_NAMESPACE],
		apply: async ({ context, output, reporter }) => {
			const force = context.options.force === true;
			if (force) {
				reporter.info(
					'Force mode enabled; skipping existing plugin detection.'
				);
				output.pluginDetection = createEmptyPluginDetection();
				return;
			}

			reporter.info('Scanning workspace for existing plugin files...');
			const descriptors = output.scaffoldFiles ?? [];
			output.pluginDetection = await detectExistingPlugin({
				workspace: context.workspace,
				descriptors,
			});

			if (!output.pluginDetection.detected) {
				reporter.info(
					'No existing plugin detected. Writing full template files.'
				);
				return;
			}

			const reasonText = formatReasonList(output.pluginDetection.reasons);
			reporter.warn(
				`Existing plugin detected (${reasonText}); preserving author-owned files.`
			);
		},
	});
}

function createCollisionHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_COLLISIONS,
		kind: 'fragment',
		dependsOn: [INIT_FRAGMENT_KEY_DETECT],
		apply: async ({ context, output, reporter }) => {
			reporter.info('Checking for conflicting files...');

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

			if (skipped.length === 0) {
				reporter.info('No conflicting files detected.');
				return;
			}

			reporter.info(
				`Skipping ${skipped.length} conflicting file${skipped.length === 1 ? '' : 's'} (use --force to overwrite).`
			);
		},
	});
}

function createDependencyHelper(): InitFragmentHelper {
	return createHelper({
		key: INIT_FRAGMENT_KEY_DEPENDENCIES,
		kind: 'fragment',
		dependsOn: [INIT_FRAGMENT_KEY_COLLISIONS],
		apply: async ({ context, output, reporter }) => {
			reporter.info('Resolving dependency versions...');

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

			reporter.info(
				`Dependencies resolved from ${dependencyResolution.source}.`
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
			reporter.info('Scaffolding WPKernel project files...');
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

				const stats = summarizeScaffoldSummaries(summaries);
				reporter.info(
					formatScaffoldSummaryMessage(
						stats,
						manifest?.writes.length ?? 0
					)
				);
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

			const npmMeasurement = await measureStageWithProgress({
				reporter,
				label: 'Installing npm dependencies',
				stage: 'init.install.npm',
				budgetMs: budgets.npm ?? DEFAULT_NODE_INSTALL_BUDGET_MS,
				run: async () => {
					await installers.installNodeDependencies(
						context.workspace.root
					);
				},
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
				const composerMeasurement = await measureStageWithProgress({
					reporter,
					label: 'Installing composer dependencies',
					stage: 'init.install.composer',
					budgetMs:
						budgets.composer ?? DEFAULT_COMPOSER_INSTALL_BUDGET_MS,
					run: async () => {
						await installers.installComposerDependencies(
							context.workspace.root
						);
					},
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

function formatReasonList(values: readonly string[]): string {
	if (values.length === 0) {
		return 'unknown reason';
	}

	if (values.length === 1) {
		return values[0] ?? 'unknown reason';
	}

	const head = values.slice(0, -1).join(', ');
	const tail = values[values.length - 1] ?? '';
	return `${head} and ${tail}`;
}

function summarizeScaffoldSummaries(summaries: readonly ScaffoldSummary[]): {
	created: number;
	updated: number;
	skipped: number;
	total: number;
} {
	const stats = { created: 0, updated: 0, skipped: 0, total: 0 };

	for (const summary of summaries) {
		stats.total += 1;
		switch (summary.status) {
			case 'created': {
				stats.created += 1;

				break;
			}
			case 'updated': {
				stats.updated += 1;

				break;
			}
			case 'skipped': {
				stats.skipped += 1;

				break;
			}
			// No default
		}
	}

	return stats;
}

function formatScaffoldSummaryMessage(
	stats: ReturnType<typeof summarizeScaffoldSummaries>,
	manifestWrites: number
): string {
	const segments = [
		`created: ${stats.created}`,
		`updated: ${stats.updated}`,
		`skipped: ${stats.skipped}`,
	];

	const totalWrites =
		manifestWrites > 0 ? ` (${manifestWrites} files committed)` : '';
	return `Project files written${totalWrites} (${segments.join(', ')}).`;
}
