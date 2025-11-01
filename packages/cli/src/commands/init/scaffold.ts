import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { Workspace } from '../../next/workspace';
import {
	applyReplacements,
	buildComposerPackageName,
	buildPhpNamespace,
	ensureTrailingNewline,
	fileExists,
	loadTemplate,
	resolvePathAliasEntries,
	formatPathsForTemplate,
	slugify,
	type ScaffoldFileDescriptor,
	type ScaffoldStatus,
} from './utils';

const WPK_CONFIG_FILENAME = WPK_CONFIG_SOURCES.WPK_CONFIG_TS;
const SRC_INDEX_PATH = path.join('src', 'index.ts');
const ESLINT_CONFIG_FILENAME = 'eslint.config.js';
const TSCONFIG_FILENAME = 'tsconfig.json';
const JSCONFIG_FILENAME = 'jsconfig.json';
const COMPOSER_JSON_FILENAME = 'composer.json';
const INC_GITKEEP = path.join('inc', '.gitkeep');
const PLUGIN_LOADER = 'plugin.php';
const VITE_CONFIG_FILENAME = 'vite.config.ts';

export function buildScaffoldDescriptors(
	namespace: string
): ScaffoldFileDescriptor[] {
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
			relativePath: PLUGIN_LOADER,
			templatePath: PLUGIN_LOADER,
			replacements: {
				__WPK_PLUGIN_TITLE__: buildPluginTitle(namespace),
				__WPK_PLUGIN_TEXT_DOMAIN__: namespace,
				__WPK_PHP_NAMESPACE__: buildPhpNamespace(namespace).replace(
					/\\\\$/u,
					''
				),
				__WPK_PLUGIN_PACKAGE__: buildPluginPackage(namespace),
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

function buildPluginTitle(namespace: string): string {
	const slug = slugify(namespace);
	if (!slug) {
		return 'WP Kernel Plugin';
	}

	return slug
		.split('-')
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function buildPluginPackage(namespace: string): string {
	const phpNamespace = buildPhpNamespace(namespace).replace(/\\\\$/u, '');
	return phpNamespace.replace(/\\/g, '');
}

export function buildReplacementMap(
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

export async function buildPathsReplacement(
	workspaceRoot: string
): Promise<string> {
	const entries = await resolvePathAliasEntries(workspaceRoot);
	return formatPathsForTemplate(entries);
}

export async function assertNoCollisions({
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

	throw new WPKernelError('ValidationError', {
		message:
			'Refusing to overwrite existing files. Re-run with --force to replace them.',
		data: { collisions },
	});
}

export async function writeScaffoldFiles({
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
