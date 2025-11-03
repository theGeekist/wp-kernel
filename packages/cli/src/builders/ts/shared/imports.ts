import path from 'node:path';
import type { Workspace } from '../../../workspace/types';

export const MODULE_SOURCE_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
] as const;

export interface ModuleSpecifierOptions {
	readonly workspace: Workspace;
	readonly from: string;
	readonly target: string;
}

export interface ResolveResourceImportOptions {
	readonly workspace: Workspace;
	readonly from: string;
	readonly resourceKey: string;
	readonly configured?: string;
}

export interface ResolveKernelImportOptions {
	readonly workspace: Workspace;
	readonly from: string;
	readonly configured?: string;
}

export async function resolveResourceImport({
	workspace,
	from,
	resourceKey,
	configured,
}: ResolveResourceImportOptions): Promise<string> {
	if (configured) {
		return configured;
	}

	const resolved = await findWorkspaceModule(
		workspace,
		path.join('src', 'resources', resourceKey)
	);
	if (resolved) {
		return buildModuleSpecifier({ workspace, from, target: resolved });
	}

	return `@/resources/${resourceKey}`;
}

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
