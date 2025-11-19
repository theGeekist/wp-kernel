import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace } from '../../workspace';
import { appendPackageSummary, writePackageJson } from './package-json';
import { writeScaffoldFiles } from './scaffold';
import type { DependencyResolution } from './dependency-versions';
import type {
	InitWorkflowResult,
	InstallationMeasurements,
	PluginDetectionResult,
	ScaffoldSummary,
} from './types';
import { formatSummary } from './utils';
import type { WorkspaceLanguage } from './workspace-language';

const WPK_CONFIG_DOC_URL = 'https://wpkernel.dev/reference/wpk-config';

export function logDependencyResolution({
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

export async function applyInitWrites({
	workspace,
	scaffoldFiles,
	replacements,
	force,
	skipSet,
	namespace,
	dependencyResolution,
	reporter,
	pluginDetection,
	workspaceLanguage,
}: {
	readonly workspace: Workspace;
	readonly scaffoldFiles: Parameters<typeof writeScaffoldFiles>[0]['files'];
	readonly replacements: Parameters<
		typeof writeScaffoldFiles
	>[0]['replacements'];
	readonly force: boolean;
	readonly skipSet: Parameters<typeof writeScaffoldFiles>[0]['skip'];
	readonly namespace: string;
	readonly dependencyResolution: DependencyResolution;
	readonly reporter: Reporter;
	readonly pluginDetection: PluginDetectionResult;
	readonly workspaceLanguage: WorkspaceLanguage;
}): Promise<ScaffoldSummary[]> {
	const summaries = await writeScaffoldFiles({
		workspace,
		files: scaffoldFiles,
		replacements,
		force,
		skip: skipSet,
		namespace,
	});

	const packageStatus = await writePackageJson(workspace, {
		namespace,
		force,
		dependencyResolution,
	});

	appendPackageSummary({ summaries, packageStatus });

	const jsOnlyWorkspace =
		workspaceLanguage === 'javascript' &&
		(pluginDetection.detected || hasSkippedSummaries(summaries));

	if (
		!force &&
		(pluginDetection.detected || hasSkippedSummaries(summaries))
	) {
		logAdoptionSummary({
			reporter,
			skipped: collectSkippedPaths(summaries),
			reasons: pluginDetection.reasons,
		});
	}

	if (jsOnlyWorkspace) {
		logJavaScriptWorkspaceWarning(reporter);
	}

	return summaries;
}

export function buildWorkflowResult({
	manifest,
	summaries,
	templateName,
	namespace,
	dependencySource,
	installations,
}: {
	readonly manifest: InitWorkflowResult['manifest'];
	readonly summaries: ScaffoldSummary[];
	readonly templateName: string;
	readonly namespace: string;
	readonly dependencySource: string;
	readonly installations?: InstallationMeasurements;
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
		installations,
	};
}

function hasSkippedSummaries(summaries: ScaffoldSummary[]): boolean {
	return summaries.some((entry) => entry.status === 'skipped');
}

function collectSkippedPaths(summaries: ScaffoldSummary[]): string[] {
	return summaries
		.filter((entry) => entry.status === 'skipped')
		.map((entry) => entry.path)
		.filter((filePath, index, all) => all.indexOf(filePath) === index)
		.sort();
}

function logAdoptionSummary({
	reporter,
	skipped,
	reasons,
}: {
	readonly reporter: Reporter;
	readonly skipped: readonly string[];
	readonly reasons: readonly string[];
}): void {
	const reasonText =
		reasons.length > 0
			? `detected ${formatReasonList(reasons)}`
			: 'detected existing files';
	const skipText =
		skipped.length > 0
			? `skipped ${formatReasonList(skipped)}`
			: 'no template files were skipped';

	reporter.info(
		`[wpk] init ${reasonText}; ${skipText}. Re-run with --force to overwrite author-owned files.`
	);
}

function formatReasonList(values: readonly string[]): string {
	if (values.length === 0) {
		return '';
	}

	if (values.length === 1) {
		return values[0] ?? '';
	}

	const head = values.slice(0, -1).join(', ');
	const tail = values[values.length - 1] ?? '';
	return `${head} and ${tail}`;
}

function logJavaScriptWorkspaceWarning(reporter: Reporter): void {
	reporter.warn(
		'[wpk] init detected a JavaScript-only workspace. Generated files, including wpk.config.ts, use TypeScript. Keep the scaffolded tsconfig and dev dependencies so wpk commands continue to run.'
	);
	reporter.info(`Docs: ${WPK_CONFIG_DOC_URL}`);
}
