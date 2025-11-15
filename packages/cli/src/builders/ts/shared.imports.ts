import path from 'node:path';
import type { Workspace } from '../../workspace/types';
import {
	type ResolveResourceImportOptions,
	type ResolveKernelImportOptions,
	type ModuleSpecifierOptions,
} from './types';
import { toCamelCase } from './shared.metadata';

/**
 * Workspace file extensions that qualify as module sources.
 *
 * @internal
 */
export const MODULE_SOURCE_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
] as const;

/**
 * Resolves a resource module import path, falling back to the configured alias.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.from
 * @param    root0.resourceKey
 * @param    root0.resourceSymbol
 * @param    root0.configPath
 * @param    root0.configured
 * @category Builders
 */
export async function resolveResourceImport({
	workspace,
	from,
	resourceKey,
	resourceSymbol,
	configPath,
	configured,
}: ResolveResourceImportOptions): Promise<string> {
	if (configured) {
		return configured;
	}

	const existingModule = await findWorkspaceModule(
		workspace,
		path.join('src', 'resources', resourceKey)
	);
	if (existingModule) {
		return buildModuleSpecifier({
			workspace,
			from,
			target: existingModule,
		});
	}

	const stubPath = await ensureResourceModule({
		workspace,
		resourceKey,
		resourceSymbol:
			resourceSymbol && resourceSymbol.length > 0
				? resourceSymbol
				: toCamelCase(resourceKey),
		configPath,
	});

	if (stubPath) {
		return buildModuleSpecifier({
			workspace,
			from,
			target: stubPath,
		});
	}

	return `@/resources/${resourceKey}`;
}

/**
 * Resolves the kernel bootstrap import path for generated modules.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.from
 * @param    root0.configured
 * @category Builders
 */
export async function resolveKernelImport({
	workspace,
	from,
	configured,
}: ResolveKernelImportOptions): Promise<string> {
	if (configured) {
		return configured;
	}

	const resolved = await findWorkspaceModule(
		workspace,
		path.join('src', 'bootstrap', 'kernel')
	);
	if (resolved) {
		return buildModuleSpecifier({ workspace, from, target: resolved });
	}

	return '@/bootstrap/kernel';
}

/**
 * Builds a module specifier relative to the caller or via the workspace alias.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.from
 * @param    root0.target
 * @category Builders
 */
export function buildModuleSpecifier({
	workspace,
	from,
	target,
}: ModuleSpecifierOptions): string {
	const fromAbsolute = workspace.resolve(from);
	const targetAbsolute = path.isAbsolute(target)
		? target
		: workspace.resolve(target);
	const workspaceRoot = workspace.resolve('.');
	const relativeToWorkspace = path.relative(workspaceRoot, targetAbsolute);

	if (relativeToWorkspace.startsWith('..')) {
		const aliasTarget = stripExtension(relativeToWorkspace)
			.replace(/^(\.\.[\\/])+/, '')
			.replace(/\\/g, '/');

		const normalisedAlias =
			aliasTarget.length > 0 ? aliasTarget.replace(/^\/+/u, '') : '';

		return normalisedAlias.length > 0 ? `@/${normalisedAlias}` : '@/';
	}

	const relative = path.relative(path.dirname(fromAbsolute), targetAbsolute);
	const withoutExtension = stripExtension(relative);

	return normaliseModuleSpecifier(withoutExtension);
}

export async function findWorkspaceModule(
	workspace: Workspace,
	basePath: string
): Promise<string | null> {
	for (const extension of MODULE_SOURCE_EXTENSIONS) {
		const candidate = `${basePath}${extension}`;
		if (await workspace.exists(candidate)) {
			return candidate;
		}
	}

	return null;
}

function stripExtension(modulePath: string): string {
	for (const extension of MODULE_SOURCE_EXTENSIONS) {
		if (modulePath.endsWith(extension)) {
			return modulePath.slice(0, -extension.length);
		}
	}

	return modulePath;
}

function normaliseModuleSpecifier(specifier: string): string {
	const normalised = specifier.replace(/\\/g, '/');
	if (normalised.startsWith('.')) {
		return normalised;
	}
	return `./${normalised}`;
}

async function ensureResourceModule({
	workspace,
	resourceKey,
	resourceSymbol,
	configPath,
}: {
	readonly workspace: Workspace;
	readonly resourceKey: string;
	readonly resourceSymbol: string;
	readonly configPath?: string;
}): Promise<string | null> {
	if (!configPath) {
		return null;
	}

	const resourcePath = path.join('src', 'resources', `${resourceKey}.ts`);
	if (await workspace.exists(resourcePath)) {
		return resourcePath;
	}

	const configSpecifier = buildModuleSpecifier({
		workspace,
		from: resourcePath,
		target: configPath,
	});

	const resourceAccess = buildResourceAccessor(resourceKey);

	const contents = [
		`import { wpkConfig } from '${configSpecifier}';`,
		'',
		`export const ${resourceSymbol} = ${resourceAccess};`,
		'',
	].join('\n');

	await workspace.write(resourcePath, contents, { ensureDir: true });
	return resourcePath;
}

function buildResourceAccessor(resourceKey: string): string {
	const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
	if (identifierPattern.test(resourceKey)) {
		return `wpkConfig.resources.${resourceKey}`;
	}

	return `wpkConfig.resources[${JSON.stringify(resourceKey)}]`;
}
