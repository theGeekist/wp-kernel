import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace, FileManifest } from '../../next/workspace';
import { resolveDependencyVersions } from './dependency-versions';
import { appendPackageSummary, writePackageJson } from './package-json';
import {
	assertNoCollisions,
	buildPathsReplacement,
	buildReplacementMap,
	buildScaffoldDescriptors,
	writeScaffoldFiles,
} from './scaffold';
import {
	formatSummary,
	parseStringOption,
	type ScaffoldStatus,
	shouldPreferRegistryVersions,
	slugify,
} from './utils';

export interface InitWorkflowOptions {
	readonly workspace: Workspace;
	readonly reporter: Reporter;
	readonly projectName?: string;
	readonly template?: string;
	readonly force?: boolean;
	readonly verbose?: boolean;
	readonly preferRegistryVersionsFlag?: boolean;
	readonly env?: {
		readonly WPK_PREFER_REGISTRY_VERSIONS?: string;
		readonly REGISTRY_URL?: string;
	};
}

export interface InitWorkflowResult {
	readonly manifest: FileManifest;
	readonly summaryText: string;
	readonly summaries: Array<{ path: string; status: ScaffoldStatus }>;
	readonly dependencySource: string;
	readonly namespace: string;
	readonly templateName: string;
}

export async function runInitWorkflow({
	workspace,
	reporter,
	projectName,
	template = 'plugin',
	force = false,
	verbose = false,
	preferRegistryVersionsFlag = false,
	env = {},
}: InitWorkflowOptions): Promise<InitWorkflowResult> {
	const namespace = slugify(
		parseStringOption(projectName) ?? path.basename(workspace.root)
	);
	const templateName = template ?? 'plugin';
	const scaffoldFiles = buildScaffoldDescriptors(namespace);

	await assertNoCollisions({ workspace, files: scaffoldFiles, force });

	const dependencyResolution = await resolveDependencyVersions(
		workspace.root,
		{
			preferRegistryVersions: shouldPreferRegistryVersions({
				cliFlag: preferRegistryVersionsFlag,
				env: env.WPK_PREFER_REGISTRY_VERSIONS,
			}),
			registryUrl: env.REGISTRY_URL,
		}
	);

	logDependencyResolution({
		reporter,
		verbose,
		source: dependencyResolution.source,
	});

	const tsconfigReplacements = await buildPathsReplacement(workspace.root);
	const replacements = buildReplacementMap(tsconfigReplacements);

	workspace.begin('init');
	try {
		const summaries = await writeScaffoldFiles({
			workspace,
			files: scaffoldFiles,
			replacements,
		});

		const packageStatus = await writePackageJson(workspace, {
			namespace,
			force,
			dependencyResolution,
		});

		appendPackageSummary({ summaries, packageStatus });

		const manifest = await workspace.commit('init');
		return buildWorkflowResult({
			manifest,
			summaries,
			templateName,
			namespace,
			dependencySource: dependencyResolution.source,
		});
	} catch (error) {
		await workspace.rollback('init').catch(() => undefined);
		throw error;
	}
}

function buildWorkflowResult({
	manifest,
	summaries,
	templateName,
	namespace,
	dependencySource,
}: {
	readonly manifest: FileManifest;
	readonly summaries: Array<{ path: string; status: ScaffoldStatus }>;
	readonly templateName: string;
	readonly namespace: string;
	readonly dependencySource: string;
}): InitWorkflowResult {
	return {
		manifest,
		summaries,
		summaryText: formatSummary({
			namespace,
			templateName,
			summaries,
		}),
		dependencySource,
		namespace,
		templateName,
	};
}

function logDependencyResolution({
	reporter,
	verbose,
	source,
}: {
	readonly reporter: Reporter;
	readonly verbose: boolean;
	readonly source: string;
}): void {
	if (!verbose) {
		return;
	}

	reporter.info(`init dependency versions resolved from ${source}`);
}
