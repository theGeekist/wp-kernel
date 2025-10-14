import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command, Option } from 'clipanion';
import type { BaseContext } from 'clipanion';
import { KernelError } from '@wpkernel/core/error';

interface ScaffoldFile {
	relativePath: string;
	templatePath: string;
	replacements?: Record<string, string>;
}

type FileStatus = 'created' | 'updated';

const INIT_TEMPLATE_ROOT = path.resolve(
	path.dirname(fileURLToPath(getModuleUrl())),
	'../../templates/init'
);

const PACKAGE_DEFAULT_VERSION = '0.1.0';
const PACKAGE_DEFAULT_TYPE = 'module';
const PACKAGE_DEFAULT_PRIVATE = true;

const SCRIPT_RECOMMENDATIONS: Record<string, string> = {
	start: 'wpk start',
	build: 'wpk build',
	generate: 'wpk generate',
	apply: 'wpk apply',
};

declare global {
	var __WPK_CLI_MODULE_URL__: string | undefined;
}

function getModuleUrl(): string {
	const moduleUrl = globalThis.__WPK_CLI_MODULE_URL__;
	if (typeof moduleUrl === 'string') {
		return moduleUrl;
	}

	if (typeof __filename === 'string') {
		return pathToFileURL(__filename).href;
	}

	throw new KernelError('DeveloperError', {
		message: 'Unable to resolve CLI module URL for init command.',
	});
}

const WPK_CONFIG_FILENAME = ['kernel', 'config.ts'].join('.');
const SRC_INDEX_PATH = path.join('src', 'index.ts');
const ESLINT_CONFIG_FILENAME = 'eslint.config.js';
const TSCONFIG_FILENAME = 'tsconfig.json';
const PACKAGE_JSON_FILENAME = 'package.json';

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

		const files: ScaffoldFile[] = [
			{
				relativePath: WPK_CONFIG_FILENAME,
				templatePath: WPK_CONFIG_FILENAME,
				replacements: {
					__WPK_NAMESPACE__: namespace,
				},
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
				relativePath: ESLINT_CONFIG_FILENAME,
				templatePath: 'eslint.config.js',
			},
		];

		try {
			const packageState = await loadPackageJson(workspace);
			await ensureNoCollisions(workspace, files, force);

			const fileSummaries = await scaffoldProjectFiles(workspace, files);

			const packageStatus = await writePackageJson(packageState, {
				packageName,
				force,
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
	options: { packageName: string; force: boolean }
): Promise<FileStatus | null> {
	if (state.type === 'missing') {
		const template = await loadTemplate(PACKAGE_JSON_FILENAME);
		const rendered = applyReplacements(template, {
			__WPK_PACKAGE_NAME__: options.packageName,
		});
		await fs.writeFile(state.path, ensureTrailingNewline(rendered), 'utf8');
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
	options: { packageName: string; force: boolean }
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
	[key: string]: unknown;
};

type PackageState =
	| { type: 'missing'; path: string }
	| { type: 'existing'; path: string; data: PackageJson };

type PackageJsonStringKey = 'name' | 'version' | 'type';
