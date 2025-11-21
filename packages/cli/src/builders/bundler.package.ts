import {
	DEFAULT_PACKAGE_SCRIPTS,
	MONOREPO_DEP_DENYLIST,
} from './bundler.constants';
import {
	resolveDependencyVersions,
	type DependencyResolution,
} from '../commands/init/dependency-versions';
import type { PackageJsonLike } from './types';

function mergeSection(
	existing: Record<string, string> | undefined,
	required: Record<string, string>
): { merged: Record<string, string>; changed: boolean } {
	const merged = { ...(existing ?? {}) };
	let changed = false;

	for (const [name, version] of Object.entries(required)) {
		if (merged[name]) {
			continue;
		}

		merged[name] = version;
		changed = true;
	}

	return { merged, changed };
}

function scriptsHaveChanged(
	previous: Record<string, string> | undefined,
	next: Record<string, string>
): boolean {
	const base = previous ?? {};
	const prevKeys = new Set(Object.keys(base));
	const nextKeys = Object.keys(next);

	for (const key of nextKeys) {
		if (base[key] !== next[key]) {
			return true;
		}
		prevKeys.delete(key);
	}

	// Any remaining previous keys were removed, so scripts changed.
	return prevKeys.size > 0;
}

function scrubMonorepoDeps(
	deps: Record<string, string>
): Record<string, string> {
	const cleaned: Record<string, string> = {};
	for (const [key, value] of Object.entries(deps)) {
		if (MONOREPO_DEP_DENYLIST.has(key)) {
			continue;
		}
		cleaned[key] = value;
	}
	return cleaned;
}

export function mergePackageJsonDependencies(options: {
	readonly pkg: PackageJsonLike | null;
	readonly resolved: DependencyResolution;
	readonly namespace: string;
	readonly version: string;
}): { pkg: PackageJsonLike; changed: boolean } {
	const base =
		options.pkg ??
		({
			name: options.namespace || 'wpk-plugin',
			version: options.version || '0.0.0',
			private: true,
			type: 'module',
			dependencies: {},
			devDependencies: {},
			peerDependencies: {},
			scripts: DEFAULT_PACKAGE_SCRIPTS,
		} satisfies PackageJsonLike);

	const previousScripts = base.scripts ?? {};
	const scripts = { ...DEFAULT_PACKAGE_SCRIPTS, ...previousScripts };
	const scriptChanged = scriptsHaveChanged(previousScripts, scripts);
	const next = { ...base, scripts };
	let changed = !options.pkg || scriptChanged;

	const deps = mergeSection(
		base.dependencies,
		scrubMonorepoDeps(options.resolved.dependencies)
	);
	const peerDeps = mergeSection(
		base.peerDependencies,
		scrubMonorepoDeps(options.resolved.peerDependencies)
	);
	const devDeps = mergeSection(
		base.devDependencies,
		scrubMonorepoDeps(options.resolved.devDependencies)
	);

	if (deps.changed || peerDeps.changed || devDeps.changed) {
		changed = true;
	}

	next.dependencies = deps.merged;
	next.peerDependencies = peerDeps.merged;
	next.devDependencies = devDeps.merged;

	return { pkg: next, changed };
}

export interface EnsureBundlerDependenciesArgs {
	readonly workspaceRoot: string;
	readonly pkg: PackageJsonLike | null;
	readonly hasUiResources: boolean;
	readonly namespace: string;
	readonly version: string;
}

export async function ensureBundlerDependencies(
	args: EnsureBundlerDependenciesArgs
): Promise<{ pkg: PackageJsonLike | null; changed: boolean }> {
	if (!args.hasUiResources) {
		return { pkg: args.pkg, changed: false };
	}

	const resolved = await resolveDependencyVersions(args.workspaceRoot);
	return mergePackageJsonDependencies({
		pkg: args.pkg,
		resolved,
		namespace: args.namespace,
		version: args.version,
	});
}

export function ensureBundlerScripts(pkg: PackageJsonLike | null): {
	pkg: PackageJsonLike;
	changed: boolean;
} {
	const base =
		pkg ??
		({
			name: 'wpk-plugin',
			version: '0.0.0',
			private: true,
			type: 'module',
			dependencies: {},
			devDependencies: {},
			peerDependencies: {},
			scripts: DEFAULT_PACKAGE_SCRIPTS,
		} satisfies PackageJsonLike);
	const previousScripts = base.scripts ?? {};
	const scripts = { ...DEFAULT_PACKAGE_SCRIPTS, ...previousScripts };
	const scriptChanged = scriptsHaveChanged(previousScripts, scripts);
	const next = { ...base, scripts };

	return {
		pkg: next,
		changed: !pkg || scriptChanged,
	};
}
