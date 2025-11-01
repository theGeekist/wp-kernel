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
const VITE_CONFIG_FILENAME = 'vite.config.ts';

export function buildScaffoldDescriptors(
	namespace: string
): ScaffoldFileDescriptor[] {
	return [
		{
			relativePath: WPK_CONFIG_FILENAME,
			templatePath: WPK_CONFIG_FILENAME,
			category: 'wpk',
			replacements: {
				__WPK_NAMESPACE__: namespace,
			},
		},
		{
			relativePath: COMPOSER_JSON_FILENAME,
			templatePath: COMPOSER_JSON_FILENAME,
			category: 'author',
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
			category: 'wpk',
			skipWhenPluginDetected: true,
		},
		{
			relativePath: SRC_INDEX_PATH,
			templatePath: path.join('src', 'index.ts'),
			category: 'author',
		},
		{
			relativePath: TSCONFIG_FILENAME,
			templatePath: TSCONFIG_FILENAME,
			category: 'wpk',
		},
		{
			relativePath: JSCONFIG_FILENAME,
			templatePath: JSCONFIG_FILENAME,
			category: 'wpk',
		},
		{
			relativePath: ESLINT_CONFIG_FILENAME,
			templatePath: ESLINT_CONFIG_FILENAME,
			category: 'wpk',
		},
		{
			relativePath: VITE_CONFIG_FILENAME,
			templatePath: VITE_CONFIG_FILENAME,
			category: 'wpk',
		},
	];
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

export interface CollisionCheckResult {
	readonly skipped: readonly string[];
}

export async function assertNoCollisions({
	workspace,
	files,
	force,
	skippableTargets,
}: {
	readonly workspace: Workspace;
	readonly files: readonly ScaffoldFileDescriptor[];
	readonly force: boolean;
	readonly skippableTargets?: Iterable<string>;
}): Promise<CollisionCheckResult> {
	const collisions = await detectCollisions(workspace, files);
	if (collisions.length === 0 || force) {
		return { skipped: [] };
	}

	const descriptors = new Map(
		files.map((descriptor) => [descriptor.relativePath, descriptor])
	);

	const skipped: string[] = [];
	const fatal: string[] = [];
	const optional = new Set(skippableTargets ?? []);

	for (const relativePath of collisions) {
		const descriptor = descriptors.get(relativePath);
		if (descriptor?.category === 'author' || optional.has(relativePath)) {
			skipped.push(relativePath);
			continue;
		}

		fatal.push(relativePath);
	}

	if (fatal.length > 0) {
		throw new WPKernelError('ValidationError', {
			message:
				'Refusing to overwrite existing files. Re-run with --force to replace them.',
			data: { collisions: fatal },
		});
	}

	return { skipped };
}

export async function writeScaffoldFiles({
	workspace,
	files,
	replacements,
	force,
	skip,
}: {
	readonly workspace: Workspace;
	readonly files: readonly ScaffoldFileDescriptor[];
	readonly replacements: Map<string, Record<string, string>>;
	readonly force: boolean;
	readonly skip?: ReadonlySet<string>;
}): Promise<Array<{ path: string; status: ScaffoldStatus }>> {
	const summaries: Array<{ path: string; status: ScaffoldStatus }> = [];
	const skipSet = !force && skip ? new Set(skip) : new Set<string>();

	for (const descriptor of files) {
		if (!force && skipSet.has(descriptor.relativePath)) {
			summaries.push({
				path: descriptor.relativePath,
				status: 'skipped',
			});
			continue;
		}

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
