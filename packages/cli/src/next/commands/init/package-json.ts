import { WPKernelError } from '@wpkernel/core/error';
import type { Workspace } from '../../workspace';
import { ensureTrailingNewline } from './utils';
import type { DependencyResolution } from '../../../commands/init/dependency-versions';
import type { ScaffoldStatus } from './utils';

const PACKAGE_JSON_FILENAME = 'package.json';
const PACKAGE_DEFAULT_VERSION = '0.1.0';
const PACKAGE_DEFAULT_TYPE = 'module';
const PACKAGE_DEFAULT_PRIVATE = true;

const SCRIPT_RECOMMENDATIONS: Record<string, string> = {
	start: 'wpk start',
	build: 'wpk build',
	generate: 'wpk generate',
	apply: 'wpk apply',
};

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

export async function writePackageJson(
	workspace: Workspace,
	options: {
		namespace: string;
		force: boolean;
		dependencyResolution: DependencyResolution;
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

export function appendPackageSummary({
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
		throw new WPKernelError('ValidationError', {
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
		dependencyResolution: DependencyResolution;
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

export const packageFilenames = {
	PACKAGE_JSON_FILENAME,
};
