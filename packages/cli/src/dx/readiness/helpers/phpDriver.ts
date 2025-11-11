import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadinessHelper } from '../helper';
import { createModuleResolver } from '../../../utils/module-url';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import type { DxContext } from '../../context';
import { buildResolvePaths, resolveWorkspaceRoot } from './shared';

const DRIVER_PACKAGE = '@wpkernel/php-driver/package.json';
const ASSET_RELATIVE_PATH = ['php', 'pretty-print.php'];

export interface PhpDriverDependencies {
	readonly resolve: (id: string, opts?: { paths?: string[] }) => string;
	readonly access: typeof fs.access;
}

export interface PhpDriverState {
	readonly driverRoot: string | null;
	readonly assetPath: string | null;
	readonly workspaceRoot: string;
}

function defaultDependencies(): PhpDriverDependencies {
	return {
		resolve: createModuleResolver(),
		access: (target) => fs.access(target),
	} satisfies PhpDriverDependencies;
}

async function resolveDriverRoot(
	dependencies: PhpDriverDependencies,
	context: DxContext
): Promise<{ root: string | null; asset: string | null }> {
	try {
		const packageEntry = dependencies.resolve(DRIVER_PACKAGE, {
			paths: buildResolvePaths(context),
		});
		const root = path.dirname(packageEntry);
		const asset = path.join(root, ...ASSET_RELATIVE_PATH);
		return { root, asset };
	} catch {
		return { root: null, asset: null };
	}
}

async function assetExists(
	dependencies: PhpDriverDependencies,
	assetPath: string | null
): Promise<boolean> {
	if (!assetPath) {
		return false;
	}

	try {
		await dependencies.access(assetPath);
		return true;
	} catch {
		return false;
	}
}

export function createPhpDriverReadinessHelper(
	overrides: Partial<PhpDriverDependencies> = {}
) {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<PhpDriverState>({
		key: 'php-driver',
		async detect(context): Promise<ReadinessDetection<PhpDriverState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const { root, asset } = await resolveDriverRoot(
				dependencies,
				context
			);
			const exists = await assetExists(dependencies, asset);

			return {
				status: exists ? 'ready' : 'pending',
				state: {
					driverRoot: root,
					assetPath: asset,
					workspaceRoot,
				},
				message: exists
					? 'PHP driver assets detected.'
					: 'PHP driver assets missing from node_modules.',
			};
		},
		async confirm(
			_context,
			state
		): Promise<ReadinessConfirmation<PhpDriverState>> {
			const exists = await assetExists(dependencies, state.assetPath);

			return {
				status: exists ? 'ready' : 'pending',
				state,
				message: exists
					? 'PHP driver assets available.'
					: 'PHP driver assets still missing.',
			};
		},
	});
}
