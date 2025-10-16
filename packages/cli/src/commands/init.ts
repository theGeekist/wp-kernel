import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Command, Option } from 'clipanion';
import type { BaseContext } from 'clipanion';
import { KernelError } from '@wpkernel/core/error';
import { getCliPackageRoot } from './init/module-url';
import { resolveDependencyVersions } from './init/dependency-versions';

interface ScaffoldFile {
	relativePath: string;
	templatePath: string;
	replacements?: Record<string, string>;
}

type FileStatus = 'created' | 'updated';

const INIT_TEMPLATE_ROOT = path.join(getCliPackageRoot(), 'templates', 'init');
const INIT_VITE_CONFIG = 'vite.config.ts';

const PACKAGE_DEFAULT_VERSION = '0.1.0';
const PACKAGE_DEFAULT_TYPE = 'module';
const PACKAGE_DEFAULT_PRIVATE = true;

const SCRIPT_RECOMMENDATIONS: Record<string, string> = {
	start: 'wpk start',
	build: 'wpk build',
	generate: 'wpk generate',
	apply: 'wpk apply',
};

const WPK_CONFIG_FILENAME = ['kernel', 'config.ts'].join('.');
const SRC_INDEX_PATH = path.join('src', 'index.ts');
const ESLINT_CONFIG_FILENAME = 'eslint.config.js';
const TSCONFIG_FILENAME = 'tsconfig.json';
const JSCONFIG_FILENAME = 'jsconfig.json';
const PACKAGE_JSON_FILENAME = 'package.json';
const COMPOSER_JSON_FILENAME = 'composer.json';

/**
 * `wpk init` - initialize a WP Kernel project in the current directory.
 */
export class InitCommand extends Command {
	static override paths = [['init']];

	static override usage = Command.Usage({
		description:
			'Initialise a WP Kernel project by scaffolding config, entrypoint, and linting presets.',
		examples: [
			['Scaffold project files', 'wpk init --name=my-plugin'],
			['Overwrite existing files', 'wpk init --force'],
		],
	});

	name = Option.String('--name', {
		description: 'Project slug used for namespace/package defaults',
		required: false,
	});

	template = Option.String('--template', {
		description: 'Reserved for future templates (plugin/theme/headless)',
		required: false,
	});

	force = Option.Boolean('--force', false);
	verbose = Option.Boolean('--verbose', false);
	preferRegistryVersions = Option.Boolean(
		'--prefer-registry-versions',
		false
	);

	override async execute(): Promise<number> {
		const context = this.context as BaseContext & { cwd?: () => string };
		const workspace =
			typeof context.cwd === 'function' ? context.cwd() : process.cwd();
		const templateName = resolveStringOption(this.template) ?? 'plugin';
		const namespace = slugify(
			resolveStringOption(this.name) ?? path.basename(workspace)
		);
		const packageName = namespace;
		const force = this.force === true;
		const phpNamespace = buildPhpNamespace(namespace);
		const composerPackage = buildComposerPackageName(namespace);
		const pathEntries = await resolvePathAliasEntries(workspace);
		const formattedPaths = formatPathsForTemplate(pathEntries);
		const tsconfigReplacements = {
			'"__WPK_TSCONFIG_PATHS__"': formattedPaths,
		};
		const jsconfigReplacements = {
			'"__WPK_JSCONFIG_PATHS__"': formattedPaths,
		};

		const files: ScaffoldFile[] = [
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
					__WPK_COMPOSER_PACKAGE_NAME__: composerPackage,
					__WPK_PHP_NAMESPACE__: phpNamespace,
				},
			},
			{
				relativePath: path.join('inc', '.gitkeep'),
				templatePath: path.join('inc', '.gitkeep'),
			},
			{
				relativePath: SRC_INDEX_PATH,
				templatePath: 'src/index.ts',
			},
			{
				relativePath: TSCONFIG_FILENAME,
				templatePath: 'tsconfig.json',
				replacements: tsconfigReplacements,
			},
			{
				relativePath: JSCONFIG_FILENAME,
				templatePath: 'jsconfig.json',
				replacements: jsconfigReplacements,
			},
			{
				relativePath: ESLINT_CONFIG_FILENAME,
				templatePath: 'eslint.config.js',
			},
			{
				relativePath: INIT_VITE_CONFIG,
				templatePath: INIT_VITE_CONFIG,
			},
		];

		try {
			const packageState = await loadPackageJson(workspace);
			const dependencyVersions = await resolveDependencyVersions(
				workspace,
				{
					preferRegistryVersions: shouldPreferRegistryVersions({
						cliFlag: this.preferRegistryVersions,
						env: process.env.WPK_PREFER_REGISTRY_VERSIONS,
					}),
					registryUrl: process.env.REGISTRY_URL,
				}
			);
			await ensureNoCollisions(workspace, files, force);

			if (this.verbose) {
				this.context.stdout.write(
					`[wpk] init dependency versions resolved from ${dependencyVersions.source}\n`
				);
			}

			const fileSummaries = await scaffoldProjectFiles(workspace, files);

			const packageStatus = await writePackageJson(packageState, {
				packageName,
				force,
				dependencyVersions,
			});

			const summaries =
				packageStatus === null
					? fileSummaries
					: [
							...fileSummaries,
							{
								path: PACKAGE_JSON_FILENAME,
								status: packageStatus,
							},
						];

			this.context.stdout.write(
				formatSummary({
					namespace,
					templateName,
					summaries,
				})
			);

			return 0;
		} catch (error) {
			if (KernelError.isKernelError(error)) {
				this.context.stderr.write(formatErrorMessage(error));
				return 1;
			}

			throw error;
		}
	}
}

async function ensureNoCollisions(
	workspace: string,
	files: ScaffoldFile[],
	force: boolean
): Promise<void> {
	if (force) {
		return;
	}

	const collisions: string[] = [];

	for (const file of files) {
		const absolutePath = path.join(workspace, file.relativePath);
		if (await pathExists(absolutePath)) {
			collisions.push(file.relativePath);
		}
	}

	if (collisions.length > 0) {
		throw new KernelError('ValidationError', {
			message:
				'Refusing to overwrite existing files. Re-run with --force to replace them.',
			data: { collisions },
		});
	}
}

async function loadPackageJson(workspace: string): Promise<PackageState> {
	const packagePath = path.join(workspace, PACKAGE_JSON_FILENAME);

	if (!(await pathExists(packagePath))) {
		return { type: 'missing', path: packagePath };
	}

	const raw = await fs.readFile(packagePath, 'utf8');

	try {
		const data = JSON.parse(raw) as PackageJson;
		return { type: 'existing', path: packagePath, data };
	} catch (_error) {
		throw new KernelError('ValidationError', {
			message: 'package.json is not valid JSON.',
			data: { path: PACKAGE_JSON_FILENAME },
		});
	}
}

async function writePackageJson(
	state: PackageState,
	options: {
		packageName: string;
		force: boolean;
		dependencyVersions: Awaited<
			ReturnType<typeof resolveDependencyVersions>
		>;
	}
): Promise<FileStatus | null> {
	if (state.type === 'missing') {
		const { next } = applyPackageDefaults({}, options);
		const serialised = JSON.stringify(next, null, 2);
		await fs.writeFile(
			state.path,
			ensureTrailingNewline(serialised),
			'utf8'
		);
		return 'created';
	}

	const { changed, next } = applyPackageDefaults(state.data, options);

	if (!changed) {
		return null;
	}

	const serialised = JSON.stringify(next, null, 2);
	await fs.writeFile(state.path, ensureTrailingNewline(serialised), 'utf8');
	return 'updated';
}

function applyPackageDefaults(
	pkg: PackageJson,
	options: {
		packageName: string;
		force: boolean;
		dependencyVersions: Awaited<
			ReturnType<typeof resolveDependencyVersions>
		>;
	}
): { changed: boolean; next: PackageJson } {
	const next: PackageJson = { ...pkg };
	let changed = false;

	const stringFields: Array<{ key: PackageJsonStringKey; value: string }> = [
		{ key: 'name', value: options.packageName },
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
			options.dependencyVersions.dependencies,
			options.force
		)
	) {
		changed = true;
	}

	if (
		applyDependencyDefaults(
			next,
			'peerDependencies',
			options.dependencyVersions.peerDependencies,
			options.force
		)
	) {
		changed = true;
	}

	if (
		applyDependencyDefaults(
			next,
			'devDependencies',
			options.dependencyVersions.devDependencies,
			options.force
		)
	) {
		changed = true;
	}

	return { changed, next };
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

function formatSummary({
	namespace,
	templateName,
	summaries,
}: {
	namespace: string;
	templateName: string;
	summaries: Array<{ path: string; status: FileStatus }>;
}): string {
	const lines = [
		`[wpk] init created ${templateName} scaffold for ${namespace}`,
	];

	for (const entry of summaries) {
		lines.push(`  ${entry.status} ${entry.path}`);
	}

	return `${lines.join('\n')}\n`;
}

async function scaffoldProjectFiles(
	workspace: string,
	files: ScaffoldFile[]
): Promise<Array<{ path: string; status: FileStatus }>> {
	const summaries: Array<{ path: string; status: FileStatus }> = [];

	for (const file of files) {
		const absolutePath = path.join(workspace, file.relativePath);
		const existed = await pathExists(absolutePath);
		await ensureParentDirectory(absolutePath);
		const template = await loadTemplate(file.templatePath);
		const contents = applyReplacements(template, file.replacements ?? {});
		await fs.writeFile(
			absolutePath,
			ensureTrailingNewline(contents),
			'utf8'
		);
		summaries.push({
			path: file.relativePath,
			status: existed ? 'updated' : 'created',
		});
	}

	return summaries;
}

function formatErrorMessage(error: KernelError): string {
	const { collisions } = (error.data ?? {}) as { collisions?: string[] };
	const lines = [`[wpk] init failed: ${error.message}`];

	if (Array.isArray(collisions) && collisions.length > 0) {
		lines.push('Conflicting files:');
		for (const relativePath of collisions) {
			lines.push(`  - ${relativePath}`);
		}
	}

	if (
		error.data &&
		'path' in error.data &&
		typeof error.data.path === 'string'
	) {
		lines.push(`  - ${error.data.path}`);
	}

	return `${lines.join('\n')}\n`;
}

function slugify(value: string): string {
	const normalised = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return normalised.length > 0 ? normalised : 'wp-kernel-project';
}

function resolveStringOption(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch (error) {
		if (isENOENT(error)) {
			return false;
		}
		throw error;
	}
}

async function ensureParentDirectory(filePath: string): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function ensureTrailingNewline(contents: string): string {
	return contents.endsWith('\n') ? contents : `${contents}\n`;
}

function buildPhpNamespace(namespace: string): string {
	const segments = slugify(namespace)
		.split('-')
		.filter((segment) => segment.length > 0)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

	const base = segments.length > 0 ? segments.join('') : 'WpKernelProject';
	return `${base}\\\\`;
}

function buildComposerPackageName(namespace: string): string {
	const slug = slugify(namespace);
	return `${slug}/${slug}`;
}

async function loadTemplate(relativePath: string): Promise<string> {
	const templatePath = path.join(INIT_TEMPLATE_ROOT, relativePath);
	return fs.readFile(templatePath, 'utf8');
}

function applyReplacements(
	template: string,
	replacements: Record<string, string>
): string {
	let result = template;
	for (const [token, value] of Object.entries(replacements)) {
		result = result.replaceAll(token, value);
	}
	return result;
}

async function resolvePathAliasEntries(
	workspace: string
): Promise<Array<[string, string[]]>> {
	const entries: Array<[string, string[]]> = [['@/*', ['./src/*']]];

	const repoRoot = await findRepoRoot(workspace);

	if (!repoRoot) {
		return entries;
	}

	const repoEntries: Array<{
		alias: string;
		check: string[];
		target: string[];
	}> = [
		{
			alias: '@wpkernel/core',
			check: ['packages', 'core', 'src', 'index.ts'],
			target: ['packages', 'core', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/core/*',
			check: ['packages', 'core', 'src'],
			target: ['packages', 'core', 'src', '*'],
		},
		{
			alias: '@wpkernel/ui',
			check: ['packages', 'ui', 'src', 'index.ts'],
			target: ['packages', 'ui', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/ui/*',
			check: ['packages', 'ui', 'src'],
			target: ['packages', 'ui', 'src', '*'],
		},
		{
			alias: '@wpkernel/cli',
			check: ['packages', 'cli', 'src', 'index.ts'],
			target: ['packages', 'cli', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/cli/*',
			check: ['packages', 'cli', 'src'],
			target: ['packages', 'cli', 'src', '*'],
		},
		{
			alias: '@wpkernel/e2e-utils',
			check: ['packages', 'e2e-utils', 'src', 'index.ts'],
			target: ['packages', 'e2e-utils', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/e2e-utils/*',
			check: ['packages', 'e2e-utils', 'src'],
			target: ['packages', 'e2e-utils', 'src', '*'],
		},
		{
			alias: '@test-utils/*',
			check: ['tests', 'test-utils'],
			target: ['tests', 'test-utils', '*'],
		},
	];

	for (const entry of repoEntries) {
		const checkPath = path.join(repoRoot, ...entry.check);
		if (!(await pathExists(checkPath))) {
			continue;
		}

		const targetPath = path.join(repoRoot, ...entry.target);
		const relative = path.relative(workspace, targetPath);
		entries.push([entry.alias, [normaliseRelativePath(relative)]]);
	}

	return entries;
}

async function findRepoRoot(start: string): Promise<string | null> {
	let current = start;

	while (true) {
		if (await pathExists(path.join(current, 'pnpm-workspace.yaml'))) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return null;
		}

		current = parent;
	}
}

function formatPathsForTemplate(entries: Array<[string, string[]]>): string {
	if (entries.length === 0) {
		return '{\n                }';
	}

	const indent = '                ';
	const innerIndent = `${indent}        `;
	const ordered = [...entries].sort((a, b) => {
		if (a[0] === '@/*') {
			return -1;
		}
		if (b[0] === '@/*') {
			return 1;
		}
		return a[0].localeCompare(b[0]);
	});
	const lines: string[] = ['{'];

	ordered.forEach(([alias, targets], index) => {
		const serialisedTargets = JSON.stringify(targets);
		const suffix = index < ordered.length - 1 ? ',' : '';
		lines.push(`${innerIndent}"${alias}": ${serialisedTargets}${suffix}`);
	});

	lines.push(`${indent}}`);
	return lines.join('\n');
}

function normaliseRelativePath(value: string): string {
	const posixValue = value.split(path.sep).join('/');

	if (posixValue.startsWith('.') || posixValue.startsWith('/')) {
		return posixValue;
	}

	return `./${posixValue}`;
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

function isENOENT(error: unknown): error is { code: string } {
	return Boolean(
		error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code === 'ENOENT'
	);
}

type PackageJson = {
	name?: string;
	version?: string;
	private?: boolean;
	type?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
};

type PackageState =
	| { type: 'missing'; path: string }
	| { type: 'existing'; path: string; data: PackageJson };

type PackageJsonStringKey = 'name' | 'version' | 'type';

type DependencyKey = 'dependencies' | 'peerDependencies' | 'devDependencies';

function shouldPreferRegistryVersions({
	cliFlag,
	env,
}: {
	cliFlag: boolean;
	env: string | undefined;
}): boolean {
	if (cliFlag) {
		return true;
	}

	if (!env) {
		return false;
	}

	const normalised = env.trim().toLowerCase();
	return normalised === '1' || normalised === 'true';
}
