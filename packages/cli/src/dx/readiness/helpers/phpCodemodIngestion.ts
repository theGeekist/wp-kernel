import path from 'node:path';
import { access as accessFs, realpath as realpathFs } from 'node:fs/promises';
import { EnvironmentalError } from '@wpkernel/core/error';
import { resolvePhpCodemodIngestionScriptPath } from '@wpkernel/php-json-ast';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessStatus,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';
import { createModuleResolver } from '../../../utils/module-url';
import { buildResolvePaths, resolveWorkspaceRoot } from './shared';

const CODEMOD_MODULE_ID = '@wpkernel/php-json-ast/php/ingest-program.php';

export interface PhpCodemodIngestionDependencies {
	readonly resolve: (id: string, opts?: { paths?: string[] }) => string;
	readonly access: typeof accessFs;
	readonly realpath: typeof realpathFs;
	readonly resolveRuntimePath: () => string;
}

export interface PhpCodemodIngestionState {
	readonly workspaceRoot: string;
	readonly runtimePath: string | null;
	readonly modulePath: string | null;
	readonly runtimeRealPath: string | null;
	readonly moduleRealPath: string | null;
}

interface PathProbeResult {
	readonly path: string | null;
	readonly exists: boolean;
	readonly canonicalPath: string | null;
}

interface ProbeOutcome {
	readonly runtime: PathProbeResult;
	readonly module: PathProbeResult;
}

function defaultDependencies(): PhpCodemodIngestionDependencies {
	return {
		resolve: createModuleResolver(),
		access: accessFs,
		realpath: realpathFs,
		resolveRuntimePath: () => resolvePhpCodemodIngestionScriptPath(),
	} satisfies PhpCodemodIngestionDependencies;
}

function safeResolveRuntimePath(
	dependencies: PhpCodemodIngestionDependencies
): string | null {
	try {
		const resolved = dependencies.resolveRuntimePath();
		return typeof resolved === 'string' && resolved.length > 0
			? resolved
			: null;
	} catch {
		return null;
	}
}

async function safeResolveModulePath(
	dependencies: PhpCodemodIngestionDependencies,
	context: DxContext
): Promise<string | null> {
	try {
		return dependencies.resolve(CODEMOD_MODULE_ID, {
			paths: buildResolvePaths(context),
		});
	} catch {
		return null;
	}
}

async function probePath(
	dependencies: PhpCodemodIngestionDependencies,
	target: string | null
): Promise<PathProbeResult> {
	if (!target) {
		return { path: null, exists: false, canonicalPath: null };
	}

	try {
		await dependencies.access(target);
	} catch {
		return { path: target, exists: false, canonicalPath: null };
	}

	try {
		const canonical = await dependencies.realpath(target);
		return { path: target, exists: true, canonicalPath: canonical };
	} catch {
		return {
			path: target,
			exists: true,
			canonicalPath: path.resolve(target),
		};
	}
}

async function probePaths(
	dependencies: PhpCodemodIngestionDependencies,
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
): PhpCodemodIngestionState {
	return {
		workspaceRoot,
		runtimePath: outcome.runtime.path,
		modulePath: outcome.module.path,
		runtimeRealPath: outcome.runtime.canonicalPath,
		moduleRealPath: outcome.module.canonicalPath,
	} satisfies PhpCodemodIngestionState;
}

function buildPendingMessage(outcome: ProbeOutcome): string {
	if (!outcome.runtime.exists) {
		return 'PHP codemod ingestion runtime path missing.';
	}

	if (!outcome.module.exists) {
		return 'PHP codemod ingestion asset missing from module resolution.';
	}

	return 'PHP codemod ingestion path verification pending.';
}

function determineStatus(outcome: ProbeOutcome): ReadinessStatus {
	if (!outcome.runtime.exists || !outcome.module.exists) {
		return 'pending';
	}

	if (
		outcome.runtime.canonicalPath === null ||
		outcome.module.canonicalPath === null
	) {
		return 'pending';
	}

	if (outcome.runtime.canonicalPath !== outcome.module.canonicalPath) {
		throw new EnvironmentalError('php.codemodPath.mismatch', {
			message:
				'Resolved PHP codemod ingestion path differs between runtime and module resolution.',
			data: {
				runtimePath: outcome.runtime.path,
				modulePath: outcome.module.path,
				runtimeRealPath: outcome.runtime.canonicalPath,
				moduleRealPath: outcome.module.canonicalPath,
			},
		});
	}

	return 'ready';
}

function buildConfirmationMessage(status: ReadinessStatus): string {
	return status === 'ready'
		? 'PHP codemod ingestion path verified.'
		: 'PHP codemod ingestion path verification pending.';
}

export function createPhpCodemodIngestionReadinessHelper(
	overrides: Partial<PhpCodemodIngestionDependencies> = {}
): ReadinessHelper<PhpCodemodIngestionState> {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<PhpCodemodIngestionState>({
		key: 'php-codemod-ingestion',
		metadata: {
			label: 'PHP codemod ingestion',
			description:
				'Verifies the codemod ingestion script resolves consistently before running init workflows.',
			tags: ['php', 'codemod'],
			scopes: ['create', 'init'],
			order: 60,
		},
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<PhpCodemodIngestionState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const outcome = await probePaths(dependencies, context);
			const status = determineStatus(outcome);

			if (status === 'ready') {
				return {
					status,
					state: buildState(workspaceRoot, outcome),
					message:
						'PHP codemod ingestion path matches runtime resolver.',
				};
			}

			return {
				status,
				state: buildState(workspaceRoot, outcome),
				message: buildPendingMessage(outcome),
			};
		},
		async confirm(
			context: DxContext,
			_state: PhpCodemodIngestionState
		): Promise<ReadinessConfirmation<PhpCodemodIngestionState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const outcome = await probePaths(dependencies, context);
			const status = determineStatus(outcome);

			return {
				status: status === 'ready' ? 'ready' : 'pending',
				state: buildState(workspaceRoot, outcome),
				message: buildConfirmationMessage(status),
			};
		},
	});
}
