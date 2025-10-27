import path from 'node:path';
import { KernelError } from '@wpkernel/core/error';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { Workspace, FileManifest } from '../../workspace';
import { resolveDependencyVersions } from '../../../commands/init/dependency-versions';
import {
	applyReplacements,
	buildComposerPackageName,
	buildPhpNamespace,
	ensureTrailingNewline,
	fileExists,
	formatPathsForTemplate,
	formatSummary,
	loadTemplate,
	parseStringOption,
	resolvePathAliasEntries,
	type ScaffoldFileDescriptor,
	type ScaffoldStatus,
	shouldPreferRegistryVersions,
	slugify,
} from './utils';

const WPK_CONFIG_FILENAME = WPK_CONFIG_SOURCES.WPK_CONFIG_TS;
const SRC_INDEX_PATH = path.join('src', 'index.ts');
const ESLINT_CONFIG_FILENAME = 'eslint.config.js';
const TSCONFIG_FILENAME = 'tsconfig.json';
const JSCONFIG_FILENAME = 'jsconfig.json';
const PACKAGE_JSON_FILENAME = 'package.json';
const COMPOSER_JSON_FILENAME = 'composer.json';
const INC_GITKEEP = path.join('inc', '.gitkeep');
const VITE_CONFIG_FILENAME = 'vite.config.ts';

const PACKAGE_DEFAULT_VERSION = '0.1.0';
const PACKAGE_DEFAULT_TYPE = 'module';
const PACKAGE_DEFAULT_PRIVATE = true;

const SCRIPT_RECOMMENDATIONS: Record<string, string> = {
	start: 'wpk start',
	build: 'wpk build',
	generate: 'wpk generate',
	apply: 'wpk apply',
};

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

interface PackageJson {
	name?: string;
	version?: string;
	private?: boolean;
	type?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
}

type PackageState =
	| { type: 'missing'; path: string }
	| { type: 'existing'; path: string; data: PackageJson };

type PackageJsonStringKey = 'name' | 'version' | 'type';
type DependencyKey = 'dependencies' | 'peerDependencies' | 'devDependencies';

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

function buildScaffoldDescriptors(namespace: string): ScaffoldFileDescriptor[] {
	return [
		{
			relativePath: WPK_CONFIG_FILENAME,
			templatePath: WPK_CONFIG_FILENAME,
			replacements: {
				__WPK_NAMESPACE__: namespace,
			},
		},
		{
			relativePath: COMPOSER_JSON_FILENAME,
			templatePath: COMPOSER_JSON_FILENAME,
			replacements: {
				__WPK_NAMESPACE__: namespace,
				__WPK_COMPOSER_PACKAGE_NAME__:
					buildComposerPackageName(namespace),
				__WPK_PHP_NAMESPACE__: buildPhpNamespace(namespace),
			},
		},
		{
			relativePath: INC_GITKEEP,
			templatePath: INC_GITKEEP,
		},
		{
			relativePath: SRC_INDEX_PATH,
			templatePath: 'src/index.ts',
		},
		{
			relativePath: TSCONFIG_FILENAME,
			templatePath: 'tsconfig.json',
		},
		{
			relativePath: JSCONFIG_FILENAME,
			templatePath: 'jsconfig.json',
		},
		{
			relativePath: ESLINT_CONFIG_FILENAME,
			templatePath: 'eslint.config.js',
		},
		{
			relativePath: VITE_CONFIG_FILENAME,
			templatePath: VITE_CONFIG_FILENAME,
		},
	];
}

function buildReplacementMap(
	tsconfigReplacements: string
): Map<string, Record<string, string>> {
	return new Map<string, Record<string, string>>([
		[
			TSCONFIG_FILENAME,
			{ '"__WPK_TSCONFIG_PATHS__"': tsconfigReplacements },
		],
		[
			JSCONFIG_FILENAME,
			{ '"__WPK_JSCONFIG_PATHS__"': tsconfigReplacements },
		],
	]);
}

async function writeScaffoldFiles({
	workspace,
	files,
	replacements,
}: {
	readonly workspace: Workspace;
	readonly files: readonly ScaffoldFileDescriptor[];
	readonly replacements: Map<string, Record<string, string>>;
}): Promise<Array<{ path: string; status: ScaffoldStatus }>> {
	const summaries: Array<{ path: string; status: ScaffoldStatus }> = [];

	for (const descriptor of files) {
		const templateContents = await loadTemplate(descriptor.templatePath);
		const replaced = applyReplacements(
			templateContents,
			replacements.get(descriptor.relativePath) ??
				descriptor.replacements ??
				{}
		);

		const existed = await fileExists(workspace, descriptor.relativePath);
		await workspace.write(
			descriptor.relativePath,
			ensureTrailingNewline(replaced)
		);
		summaries.push({
			path: descriptor.relativePath,
			status: existed ? 'updated' : 'created',
		});
	}

	return summaries;
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

function appendPackageSummary({
	summaries,
	packageStatus,
}: {
	readonly summaries: Array<{ path: string; status: ScaffoldStatus }>;
	readonly packageStatus: ScaffoldStatus | null;
}): void {
	if (!packageStatus) {
		return;
	}

	summaries.push({
		path: PACKAGE_JSON_FILENAME,
		status: packageStatus,
	});
}

async function detectCollisions(
	workspace: Workspace,
	files: readonly ScaffoldFileDescriptor[]
): Promise<string[]> {
	const collisions: string[] = [];

	for (const file of files) {
		if (await fileExists(workspace, file.relativePath)) {
			collisions.push(file.relativePath);
		}
	}

	return collisions;
}

async function buildPathsReplacement(workspaceRoot: string): Promise<string> {
	const entries = await resolvePathAliasEntries(workspaceRoot);
	return formatPathsForTemplate(entries);
}

async function assertNoCollisions({
	workspace,
	files,
	force,
}: {
	readonly workspace: Workspace;
	readonly files: readonly ScaffoldFileDescriptor[];
	readonly force: boolean;
}): Promise<void> {
	const collisions = await detectCollisions(workspace, files);
	if (collisions.length === 0 || force) {
		return;
	}

	throw new KernelError('ValidationError', {
		message:
			'Refusing to overwrite existing files. Re-run with --force to replace them.',
		data: { collisions },
	});
}

async function writePackageJson(
	workspace: Workspace,
	options: {
		namespace: string;
		force: boolean;
		dependencyResolution: Awaited<
			ReturnType<typeof resolveDependencyVersions>
		>;
	}
): Promise<ScaffoldStatus | null> {
	const state = await loadPackageState(workspace);

	if (state.type === 'missing') {
		const { next } = applyPackageDefaults({}, options);
		const serialised = JSON.stringify(next, null, 2);
		await workspace.write(
			PACKAGE_JSON_FILENAME,
			ensureTrailingNewline(serialised)
		);
		return 'created';
	}

	const { changed, next } = applyPackageDefaults(state.data, options);
	if (!changed) {
		return null;
	}

	const serialised = JSON.stringify(next, null, 2);
	await workspace.write(
		PACKAGE_JSON_FILENAME,
		ensureTrailingNewline(serialised)
	);
	return 'updated';
}

async function loadPackageState(workspace: Workspace): Promise<PackageState> {
	const existing = await workspace.readText(PACKAGE_JSON_FILENAME);
	if (existing === null) {
		return { type: 'missing', path: PACKAGE_JSON_FILENAME };
	}

	try {
		const parsed = JSON.parse(existing) as PackageJson;
		return {
			type: 'existing',
			path: PACKAGE_JSON_FILENAME,
			data: parsed,
		};
	} catch (_error) {
		throw new KernelError('ValidationError', {
			message: 'package.json is not valid JSON.',
			data: { path: PACKAGE_JSON_FILENAME },
		});
	}
}

function applyPackageDefaults(
	pkg: PackageJson,
	options: {
		namespace: string;
		force: boolean;
		dependencyResolution: Awaited<
			ReturnType<typeof resolveDependencyVersions>
		>;
	}
): { changed: boolean; next: PackageJson } {
	const next: PackageJson = { ...pkg };
	let changed = false;

	const stringFields: Array<{ key: PackageJsonStringKey; value: string }> = [
		{ key: 'name', value: options.namespace },
		{ key: 'version', value: PACKAGE_DEFAULT_VERSION },
		{ key: 'type', value: PACKAGE_DEFAULT_TYPE },
	];

	for (const { key, value } of stringFields) {
		if (updateStringField(next, key, value, options.force)) {
			changed = true;
		}
	}

	if (updatePrivateFlag(next, options.force)) {
		changed = true;
	}

	const { scripts, changed: scriptsChanged } = applyScriptDefaults(
		next.scripts,
		options.force
	);

	if (scriptsChanged) {
		changed = true;
	}

	next.scripts = scripts;

	if (
		applyDependencyDefaults(
			next,
			'dependencies',
			options.dependencyResolution.dependencies,
			options.force
		)
	) {
		changed = true;
	}

	if (
		applyDependencyDefaults(
			next,
			'peerDependencies',
			options.dependencyResolution.peerDependencies,
			options.force
		)
	) {
		changed = true;
	}

	if (
		applyDependencyDefaults(
			next,
			'devDependencies',
			options.dependencyResolution.devDependencies,
			options.force
		)
	) {
		changed = true;
	}

	return { changed, next };
}

function updateStringField(
	target: PackageJson,
	key: PackageJsonStringKey,
	desired: string,
	force: boolean
): boolean {
	if (!shouldAssign(target[key], desired, force) || target[key] === desired) {
		return false;
	}

	target[key] = desired;
	return true;
}

function shouldAssign(
	current: unknown,
	desired: string,
	force: boolean
): boolean {
	if (force) {
		return current !== desired;
	}

	return typeof current !== 'string' || current.length === 0;
}

function updatePrivateFlag(target: PackageJson, force: boolean): boolean {
	const needsUpdate =
		typeof target.private !== 'boolean' ||
		(force && target.private !== PACKAGE_DEFAULT_PRIVATE);

	if (!needsUpdate) {
		return false;
	}

	const previous = target.private;
	target.private = PACKAGE_DEFAULT_PRIVATE;
	return previous !== PACKAGE_DEFAULT_PRIVATE;
}

function applyScriptDefaults(
	scripts: PackageJson['scripts'],
	force: boolean
): { scripts: Record<string, string>; changed: boolean } {
	const nextScripts = {
		...(typeof scripts === 'object' && scripts !== null ? scripts : {}),
	} as Record<string, string>;
	let changed = false;

	for (const [scriptName, command] of Object.entries(
		SCRIPT_RECOMMENDATIONS
	)) {
		const existing = nextScripts[scriptName];
		const shouldReplace =
			force || typeof existing !== 'string' || existing.length === 0;

		if (!shouldReplace) {
			continue;
		}

		if (existing !== command) {
			nextScripts[scriptName] = command;
			changed = true;
		}
	}

	return { scripts: nextScripts, changed };
}

function applyDependencyDefaults(
	target: PackageJson,
	key: DependencyKey,
	desired: Record<string, string>,
	force: boolean
): boolean {
	if (Object.keys(desired).length === 0) {
		return false;
	}

	const current = isRecordOfStrings(target[key]) ? { ...target[key] } : {};
	let changed = false;

	for (const [dep, version] of Object.entries(desired)) {
		const existing = current[dep];
		if (existing === version) {
			continue;
		}

		if (existing === undefined || force) {
			current[dep] = version;
			changed = true;
		}
	}

	if (!changed) {
		return false;
	}

	target[key] = sortDependencyMap(current);
	return true;
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
	if (!value || typeof value !== 'object') {
		return false;
	}

	return Object.values(value).every((entry) => typeof entry === 'string');
}

function sortDependencyMap(
	map: Record<string, string>
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
	);
}
