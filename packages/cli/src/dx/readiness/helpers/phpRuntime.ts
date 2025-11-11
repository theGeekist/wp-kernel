import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadinessHelper } from '../helper';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import { resolveWorkspaceRoot } from './shared';

const execFile = promisify(execFileCallback);

export interface PhpRuntimeDependencies {
	readonly exec: typeof execFile;
}

export interface PhpRuntimeState {
	readonly workspaceRoot: string;
	readonly version: string | null;
}

function defaultDependencies(): PhpRuntimeDependencies {
	return { exec: execFile } satisfies PhpRuntimeDependencies;
}

async function detectPhp(
	dependencies: PhpRuntimeDependencies,
	workspaceRoot: string
): Promise<{
	status: 'ready' | 'blocked';
	version: string | null;
	error?: unknown;
}> {
	try {
		const { stdout } = await dependencies.exec('php', ['--version'], {
			cwd: workspaceRoot,
		});
		const version = stdout.toString().split('\n')[0] ?? 'unknown';
		return { status: 'ready', version };
	} catch (error) {
		return { status: 'blocked', version: null, error };
	}
}

export function createPhpRuntimeReadinessHelper(
	overrides: Partial<PhpRuntimeDependencies> = {}
) {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<PhpRuntimeState>({
		key: 'php-runtime',
		async detect(context): Promise<ReadinessDetection<PhpRuntimeState>> {
			const workspaceRoot = resolveWorkspaceRoot(context);
			const outcome = await detectPhp(dependencies, workspaceRoot);

			if (outcome.status === 'ready') {
				return {
					status: 'ready',
					state: {
						workspaceRoot,
						version: outcome.version,
					},
					message: `PHP detected (${outcome.version ?? 'unknown'}).`,
				};
			}

			return {
				status: 'blocked',
				state: {
					workspaceRoot,
					version: null,
				},
				message: 'PHP binary not available on PATH.',
			};
		},
		async confirm(
			_context,
			state
		): Promise<ReadinessConfirmation<PhpRuntimeState>> {
			const outcome = await detectPhp(dependencies, state.workspaceRoot);

			return {
				status: outcome.status === 'ready' ? 'ready' : 'pending',
				state: {
					workspaceRoot: state.workspaceRoot,
					version: outcome.version,
				},
				message:
					outcome.status === 'ready'
						? `PHP detected (${outcome.version ?? 'unknown'}).`
						: 'PHP binary still missing.',
			};
		},
	});
}
