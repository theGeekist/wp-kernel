import { access as accessFs, realpath as realpathFs } from 'node:fs/promises';
import { EnvironmentalError } from '@wpkernel/core/error';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';
import { resolveWorkspaceRoot } from './shared';
import { resolveBundledPhpJsonAstIngestionPath } from '../../../utils/phpAssets';

export interface PhpCodemodIngestionDependencies {
	readonly access: typeof accessFs;
	readonly realpath: typeof realpathFs;
}

export interface PhpCodemodIngestionState {
	readonly workspaceRoot: string;
	readonly scriptPath: string;
	readonly canonicalPath: string | null;
}

interface PathProbeResult {
	readonly path: string;
	readonly exists: boolean;
	readonly canonicalPath: string | null;
}

function defaultDependencies(): PhpCodemodIngestionDependencies {
	return {
		access: accessFs,
		realpath: realpathFs,
	} satisfies PhpCodemodIngestionDependencies;
}

async function probeBundledScript(
	dependencies: PhpCodemodIngestionDependencies
): Promise<PathProbeResult> {
	const scriptPath = resolveBundledPhpJsonAstIngestionPath();

	try {
		await dependencies.access(scriptPath);
	} catch {
		return { path: scriptPath, exists: false, canonicalPath: null };
	}

	try {
		const canonical = await dependencies.realpath(scriptPath);
		return { path: scriptPath, exists: true, canonicalPath: canonical };
	} catch {
		return {
			path: scriptPath,
			exists: true,
			canonicalPath: null,
		};
	}
}

function buildState(
	workspaceRoot: string,
	probe: PathProbeResult
): PhpCodemodIngestionState {
	return {
		workspaceRoot,
		scriptPath: probe.path,
		canonicalPath: probe.canonicalPath,
	};
}

function determineStatus(probe: PathProbeResult): 'ready' | 'pending' {
	if (!probe.exists || probe.canonicalPath === null) {
		return 'pending';
	}

	return 'ready';
}

function buildMessage(status: 'ready' | 'pending'): string {
	return status === 'ready'
		? 'PHP codemod ingestion path verified.'
		: 'PHP codemod ingestion runtime path missing.';
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
				'Ensures the bundled PHP codemod ingestion script is available before running init workflows.',
			tags: ['php', 'codemod'],
			scopes: ['create', 'init'],
			order: 60,
		},
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<PhpCodemodIngestionState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const probe = await probeBundledScript(dependencies);
			const status = determineStatus(probe);

			if (status === 'pending' && probe.exists) {
				throw new EnvironmentalError('php.codemodPath.mismatch', {
					message:
						'Bundled PHP codemod ingestion path could not be canonicalised.',
					data: {
						scriptPath: probe.path,
					},
				});
			}

			return {
				status,
				state: buildState(workspaceRoot, probe),
				message: buildMessage(status),
			};
		},
		async confirm(
			context: DxContext,
			_state: PhpCodemodIngestionState
		): Promise<ReadinessConfirmation<PhpCodemodIngestionState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const probe = await probeBundledScript(dependencies);
			const status = determineStatus(probe);

			return {
				status,
				state: buildState(workspaceRoot, probe),
				message: buildMessage(status),
			};
		},
	});
}
