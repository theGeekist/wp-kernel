import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace, FileManifest } from '../../workspace';
import { resolveDependencyVersions } from './dependency-versions';
import type { DependencyResolution } from './dependency-versions';
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
	type ScaffoldFileDescriptor,
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

	const pluginDetection = force
		? createEmptyPluginDetection()
		: await detectExistingPlugin({
				workspace,
				descriptors: scaffoldFiles,
			});

	const { skipped: collisionSkips } = await assertNoCollisions({
		workspace,
		files: scaffoldFiles,
		force,
		skippableTargets: pluginDetection.skipTargets,
	});

	const skipSet = buildSkipSet({
		force,
		collisionSkips,
		pluginDetection,
	});

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
		const summaries = await applyInitWrites({
			workspace,
			scaffoldFiles,
			replacements,
			force,
			skipSet,
			namespace,
			dependencyResolution,
			reporter,
			pluginDetection,
		});

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

interface ApplyInitWritesOptions {
	readonly workspace: Workspace;
	readonly scaffoldFiles: readonly ScaffoldFileDescriptor[];
	readonly replacements: Map<string, Record<string, string>>;
	readonly force: boolean;
	readonly skipSet: ReadonlySet<string> | undefined;
	readonly namespace: string;
	readonly dependencyResolution: DependencyResolution;
	readonly reporter: Reporter;
	readonly pluginDetection: PluginDetectionResult;
}

async function applyInitWrites({
	workspace,
	scaffoldFiles,
	replacements,
	force,
	skipSet,
	namespace,
	dependencyResolution,
	reporter,
	pluginDetection,
}: ApplyInitWritesOptions): Promise<
	Array<{ path: string; status: ScaffoldStatus }>
> {
	const summaries = await writeScaffoldFiles({
		workspace,
		files: scaffoldFiles,
		replacements,
		force,
		skip: skipSet,
	});

	const packageStatus = await writePackageJson(workspace, {
		namespace,
		force,
		dependencyResolution,
	});

	appendPackageSummary({ summaries, packageStatus });

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

	return summaries;
}

interface PluginDetectionResult {
	readonly detected: boolean;
	readonly reasons: readonly string[];
	readonly skipTargets: readonly string[];
}

function createEmptyPluginDetection(): PluginDetectionResult {
	return { detected: false, reasons: [], skipTargets: [] };
}

function buildSkipSet({
	force,
	collisionSkips,
	pluginDetection,
}: {
	readonly force: boolean;
	readonly collisionSkips: readonly string[];
	readonly pluginDetection: PluginDetectionResult;
}): ReadonlySet<string> | undefined {
	if (force) {
		return undefined;
	}

	const skip = new Set<string>();

	for (const relativePath of collisionSkips) {
		skip.add(relativePath);
	}

	for (const relativePath of pluginDetection.skipTargets) {
		skip.add(relativePath);
	}

	return skip.size > 0 ? skip : undefined;
}

function hasSkippedSummaries(
	summaries: Array<{ path: string; status: ScaffoldStatus }>
): boolean {
	return summaries.some((entry) => entry.status === 'skipped');
}

function collectSkippedPaths(
	summaries: Array<{ path: string; status: ScaffoldStatus }>
): string[] {
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

async function detectExistingPlugin({
	workspace,
	descriptors,
}: {
	readonly workspace: Workspace;
	readonly descriptors: readonly ScaffoldFileDescriptor[];
}): Promise<PluginDetectionResult> {
	const reasons: string[] = [];
	const skipTargets = new Set<string>();

	const composerDescriptor = descriptors.find(
		(descriptor) => descriptor.relativePath === 'composer.json'
	);
	if (await composerHasAutoloadConfig(workspace, composerDescriptor)) {
		reasons.push('composer autoload entries');
	}

	const headerFiles = await findPluginHeaderFiles(workspace);
	if (headerFiles.length > 0) {
		reasons.push(`plugin header in ${formatReasonList(headerFiles)}`);
		for (const descriptor of descriptors) {
			if (descriptor.skipWhenPluginDetected) {
				skipTargets.add(descriptor.relativePath);
			}
		}
	}

	if (reasons.length === 0) {
		return createEmptyPluginDetection();
	}

	return {
		detected: true,
		reasons,
		skipTargets: Array.from(skipTargets).sort(),
	};
}

function hasComposerAutoload(composer: Record<string, unknown>): boolean {
	const composerRecord = composer as Record<string, unknown>;
	return (
		hasAutoloadEntries(composerRecord.autoload) ||
		hasAutoloadEntries(composerRecord['autoload-dev'])
	);
}

async function composerHasAutoloadConfig(
	workspace: Workspace,
	descriptor: ScaffoldFileDescriptor | undefined
): Promise<boolean> {
	if (!descriptor) {
		return false;
	}

	const composerContents = await workspace.readText(descriptor.relativePath);
	if (!composerContents) {
		return false;
	}

	try {
		const parsed = JSON.parse(composerContents) as Record<string, unknown>;
		return hasComposerAutoload(parsed);
	} catch (_error) {
		return false;
	}
}

function hasAutoloadEntries(entry: unknown): boolean {
	if (!entry) {
		return false;
	}

	if (typeof entry === 'string') {
		return entry.trim().length > 0;
	}

	if (Array.isArray(entry)) {
		return entry.some(hasAutoloadEntries);
	}

	if (typeof entry === 'object') {
		const record = entry as Record<string, unknown>;
		const values = Object.values(record);
		if (values.length === 0) {
			return Object.keys(record).length > 0;
		}

		return values.some(hasAutoloadEntries);
	}

	return false;
}

async function findPluginHeaderFiles(workspace: Workspace): Promise<string[]> {
	const headerPattern = /Plugin\s+Name\s*:/i;
	const candidates = new Set<string>();

	const rootPhpFiles = await listPhpFiles(workspace, '', {
		recursive: false,
	});
	for (const relative of rootPhpFiles) {
		candidates.add(relative);
	}

	const incPhpFiles = await listPhpFiles(workspace, 'inc', {
		recursive: true,
	});
	for (const relative of incPhpFiles) {
		candidates.add(relative);
	}

	const results: string[] = [];
	for (const relative of candidates) {
		const contents = await workspace.readText(relative);
		if (contents && headerPattern.test(contents)) {
			results.push(relative);
		}
	}

	return results.sort();
}

async function listPhpFiles(
	workspace: Workspace,
	relativeDirectory: string,
	options: { recursive?: boolean } = {}
): Promise<string[]> {
	const { recursive = false } = options;
	const normalised = normaliseRelativeDirectory(relativeDirectory);
	const entries = await readDirectoryEntries(workspace, normalised);
	if (!entries) {
		return [];
	}

	const results = collectPhpFilesFromEntries(entries, normalised);
	if (!recursive) {
		return results;
	}

	const nested = await collectNestedPhpFiles(workspace, entries, normalised);
	return results.concat(nested);
}

function normaliseRelativeDirectory(relativeDirectory: string): string {
	if (
		relativeDirectory === '' ||
		relativeDirectory === '.' ||
		relativeDirectory === './'
	) {
		return '';
	}

	const trimmed = relativeDirectory
		.replace(/^[./\\]+/, '')
		.replace(/[\\/]+$/, '');
	if (trimmed === '') {
		return '';
	}

	return trimmed.split(path.sep).join('/');
}

function joinRelativePath(base: string, segment: string): string {
	const normalisedSegment = segment.split(path.sep).join('/');
	if (base === '') {
		return normalisedSegment;
	}

	return `${base}/${normalisedSegment}`;
}

function isPhpFilename(name: string): boolean {
	return name.toLowerCase().endsWith('.php');
}

async function readDirectoryEntries(
	workspace: Workspace,
	normalised: string
): Promise<Dirent[] | null> {
	const absoluteDirectory =
		normalised === ''
			? workspace.cwd()
			: workspace.resolve(...normalised.split('/'));

	try {
		return await fs.readdir(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

function collectPhpFilesFromEntries(
	entries: readonly Dirent[],
	base: string
): string[] {
	const results: string[] = [];

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		if (!isPhpFilename(entry.name)) {
			continue;
		}

		results.push(joinRelativePath(base, entry.name));
	}

	return results;
}

async function collectNestedPhpFiles(
	workspace: Workspace,
	entries: readonly Dirent[],
	base: string
): Promise<string[]> {
	const results: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const nestedRelative = joinRelativePath(base, entry.name);
		const nested = await listPhpFiles(workspace, nestedRelative, {
			recursive: true,
		});
		results.push(...nested);
	}

	return results;
}
