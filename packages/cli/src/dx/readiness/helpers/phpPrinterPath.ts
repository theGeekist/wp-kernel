import { access as accessFs, realpath as realpathFs } from 'node:fs/promises';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';
import { resolveWorkspaceRoot } from './shared';
import { resolveBundledPhpDriverPrettyPrintPath } from '../../../utils/phpAssets';

export interface PhpPrinterPathDependencies {
	readonly access: typeof accessFs;
	readonly realpath: typeof realpathFs;
}

export interface PhpPrinterPathState {
	readonly workspaceRoot: string;
	readonly scriptPath: string;
	readonly canonicalPath: string | null;
}

interface PathProbeResult {
	readonly path: string;
	readonly exists: boolean;
	readonly canonicalPath: string | null;
}

function defaultDependencies(): PhpPrinterPathDependencies {
	return {
		access: accessFs,
		realpath: realpathFs,
	} satisfies PhpPrinterPathDependencies;
}

async function probeBundledPrinter(
	dependencies: PhpPrinterPathDependencies
): Promise<PathProbeResult> {
	const scriptPath = resolveBundledPhpDriverPrettyPrintPath();

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
): PhpPrinterPathState {
	return {
		workspaceRoot,
		scriptPath: probe.path,
		canonicalPath: probe.canonicalPath,
	};
}

function determineStatus(
	probe: PathProbeResult
): 'ready' | 'pending' | 'blocked' {
	if (!probe.exists) {
		return 'pending';
	}

	if (probe.canonicalPath === null) {
		return 'blocked';
	}

	return 'ready';
}

function buildMessage(status: 'ready' | 'pending' | 'blocked'): string {
	if (status === 'ready') {
		return 'PHP printer path verified.';
	}

	if (status === 'blocked') {
		return 'Bundled PHP printer path could not be canonicalised.';
	}

	return 'PHP printer runtime path missing.';
}

export function createPhpPrinterPathReadinessHelper(
	overrides: Partial<PhpPrinterPathDependencies> = {}
): ReadinessHelper<PhpPrinterPathState> {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<PhpPrinterPathState>({
		key: 'php-printer-path',
		metadata: {
			label: 'PHP printer path',
			description:
				'Ensures the bundled PHP printer script is available before running CLI workflows.',
			tags: ['php', 'printer'],
			scopes: ['create', 'init', 'doctor'],
			order: 70,
		},
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<PhpPrinterPathState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const probe = await probeBundledPrinter(dependencies);
			const status = determineStatus(probe);

			return {
				status,
				state: buildState(workspaceRoot, probe),
				message: buildMessage(status),
			};
		},
		async confirm(
			context: DxContext,
			_state: PhpPrinterPathState
		): Promise<ReadinessConfirmation<PhpPrinterPathState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const probe = await probeBundledPrinter(dependencies);
			const status = determineStatus(probe);
			const confirmationStatus = status === 'ready' ? 'ready' : 'pending';

			return {
				status: confirmationStatus,
				state: buildState(workspaceRoot, probe),
				message: buildMessage(status),
			};
		},
	});
}
