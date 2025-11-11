import path from 'node:path';
import { access as accessFs, realpath as realpathFs } from 'node:fs/promises';
import { EnvironmentalError } from '@wpkernel/core/error';
import { resolvePrettyPrintScriptPath } from '@wpkernel/php-driver';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessStatus,
} from '../types';
import type { DxContext } from '../../context';
import { createModuleResolver } from '../../../utils/module-url';
import { buildResolvePaths, resolveWorkspaceRoot } from './shared';

const PRETTY_PRINT_MODULE_ID = '@wpkernel/php-driver/php/pretty-print.php';

export interface PhpPrinterPathDependencies {
	readonly resolve: (id: string, opts?: { paths?: string[] }) => string;
	readonly access: typeof accessFs;
	readonly realpath: typeof realpathFs;
	readonly resolveRuntimePath: () => string;
}

export interface PhpPrinterPathState {
	readonly workspaceRoot: string;
	readonly runtimePath: string | null;
	readonly modulePath: string | null;
	readonly runtimeRealPath: string | null;
	readonly moduleRealPath: string | null;
}

interface PathProbeResult {
	readonly path: string | null;
	readonly exists: boolean;
	readonly realPath: string | null;
}

interface ProbeOutcome {
	readonly runtime: PathProbeResult;
	readonly module: PathProbeResult;
}

function defaultDependencies(): PhpPrinterPathDependencies {
	return {
		resolve: createModuleResolver(),
		access: accessFs,
		realpath: realpathFs,
		resolveRuntimePath: () => resolvePrettyPrintScriptPath(),
	} satisfies PhpPrinterPathDependencies;
}

function safeResolveRuntimePath(
	dependencies: PhpPrinterPathDependencies
): string | null {
	try {
		const resolved = dependencies.resolveRuntimePath();
		if (typeof resolved === 'string' && resolved.length > 0) {
			return resolved;
		}
	} catch (_error) {
		return null;
	}

	return null;
}

async function safeResolveModulePath(
	dependencies: PhpPrinterPathDependencies,
	context: DxContext
): Promise<string | null> {
	try {
		return dependencies.resolve(PRETTY_PRINT_MODULE_ID, {
			paths: buildResolvePaths(context),
		});
	} catch (_error) {
		return null;
	}
}

async function probePath(
	dependencies: PhpPrinterPathDependencies,
	target: string | null
): Promise<PathProbeResult> {
	if (!target) {
		return { path: null, exists: false, realPath: null };
	}

	try {
		await dependencies.access(target);
	} catch (_error) {
		return { path: target, exists: false, realPath: null };
	}

	try {
		const canonical = await dependencies.realpath(target);
		return { path: target, exists: true, realPath: canonical };
	} catch (_error) {
		return {
			path: target,
			exists: true,
			realPath: path.resolve(target),
		};
	}
}

async function probePaths(
	dependencies: PhpPrinterPathDependencies,
	context: DxContext
): Promise<ProbeOutcome> {
	const runtimePath = safeResolveRuntimePath(dependencies);
	const modulePath = await safeResolveModulePath(dependencies, context);

	const [runtime, module] = await Promise.all([
		probePath(dependencies, runtimePath),
		probePath(dependencies, modulePath),
	]);

	return { runtime, module } satisfies ProbeOutcome;
}

function buildState(
	workspaceRoot: string,
	outcome: ProbeOutcome
): PhpPrinterPathState {
	return {
		workspaceRoot,
		runtimePath: outcome.runtime.path,
		modulePath: outcome.module.path,
		runtimeRealPath: outcome.runtime.realPath,
		moduleRealPath: outcome.module.realPath,
	} satisfies PhpPrinterPathState;
}

function buildPendingMessage(outcome: ProbeOutcome): string {
	if (!outcome.runtime.exists) {
		return 'PHP printer runtime path missing.';
	}

	if (!outcome.module.exists) {
		return 'PHP printer asset missing from module resolution.';
	}

	return 'PHP printer path verification pending.';
}

function determineStatus(outcome: ProbeOutcome): ReadinessStatus {
	if (!outcome.runtime.exists || !outcome.module.exists) {
		return 'pending';
	}

	if (outcome.runtime.realPath === null || outcome.module.realPath === null) {
		return 'pending';
	}

	if (outcome.runtime.realPath !== outcome.module.realPath) {
		throw new EnvironmentalError('php.printerPath.mismatch', {
			message:
				'Resolved PHP printer path differs between runtime and module resolution.',
			data: {
				runtimePath: outcome.runtime.path,
				modulePath: outcome.module.path,
				runtimeRealPath: outcome.runtime.realPath,
				moduleRealPath: outcome.module.realPath,
			},
		});
	}

	return 'ready';
}

function buildConfirmationMessage(status: ReadinessStatus): string {
	if (status === 'ready') {
		return 'PHP printer path verified.';
	}

	return 'PHP printer path verification pending.';
}

export function createPhpPrinterPathReadinessHelper(
	overrides: Partial<PhpPrinterPathDependencies> = {}
) {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<PhpPrinterPathState>({
		key: 'php-printer-path',
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<PhpPrinterPathState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const outcome = await probePaths(dependencies, context);
			const status = determineStatus(outcome);

			if (status !== 'ready') {
				return {
					status,
					state: buildState(workspaceRoot, outcome),
					message: buildPendingMessage(outcome),
				} satisfies ReadinessDetection<PhpPrinterPathState>;
			}

			return {
				status: 'ready',
				state: buildState(workspaceRoot, outcome),
				message: 'PHP printer path matches runtime resolver.',
			} satisfies ReadinessDetection<PhpPrinterPathState>;
		},
		async confirm(
			context: DxContext,
			_state
		): Promise<ReadinessConfirmation<PhpPrinterPathState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const outcome = await probePaths(dependencies, context);
			const status = determineStatus(outcome);

			return {
				status: status === 'ready' ? 'ready' : 'pending',
				state: buildState(workspaceRoot, outcome),
				message: buildConfirmationMessage(status),
			} satisfies ReadinessConfirmation<PhpPrinterPathState>;
		},
	});
}
