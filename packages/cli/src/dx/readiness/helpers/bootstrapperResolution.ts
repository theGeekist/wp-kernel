import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import {
	access as accessFs,
	mkdtemp as mkdtempFs,
	rm as rmFs,
} from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { EnvironmentalError, WPKernelError } from '@wpkernel/core/error';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessStatus,
} from '../types';
import type { DxContext } from '../../context';

const execFile = promisify(execFileCallback);

type Access = typeof accessFs;
type MkdirTemp = typeof mkdtempFs;
type Remove = typeof rmFs;
type ExecFile = typeof execFile;

export interface BootstrapperResolutionDependencies {
	readonly access: Access;
	readonly mkdtemp: MkdirTemp;
	readonly rm: Remove;
	readonly exec: ExecFile;
}

export interface BootstrapperResolutionHelperOptions {
	readonly dependencies?: Partial<BootstrapperResolutionDependencies>;
}

export interface BootstrapperResolutionState {
	readonly repoRoot: string;
	readonly bootstrapperPath: string;
	readonly lastRun?: BootstrapperRunResult;
}

interface BootstrapperRunResult {
	readonly durationMs: number;
	readonly stdout: string;
	readonly stderr: string;
}

function defaultDependencies(): BootstrapperResolutionDependencies {
	return {
		access: accessFs,
		mkdtemp: mkdtempFs,
		rm: rmFs,
		exec: execFile,
	} satisfies BootstrapperResolutionDependencies;
}

function noEntry(error: unknown): boolean {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: string }) &&
		(error as { code?: string }).code === 'ENOENT'
	);
}

async function resolveRepoRoot(start: string, access: Access): Promise<string> {
	let current = path.resolve(start);

	while (true) {
		const marker = path.join(current, 'pnpm-workspace.yaml');

		try {
			await access(marker);
			return current;
		} catch (error) {
			if (!noEntry(error)) {
				throw error;
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			throw new WPKernelError('DeveloperError', {
				message:
					'Unable to resolve repository root for bootstrapper readiness helper.',
				context: { start },
			});
		}

		current = parent;
	}
}

function buildBootstrapperPath(repoRoot: string): string {
	return path.join(repoRoot, 'packages', 'create-wpk', 'dist', 'index.js');
}

function buildSuccessMessage(
	result: BootstrapperRunResult | undefined
): string {
	if (!result) {
		return 'Bootstrapper resolution pending verification.';
	}

	return 'Bootstrapper resolved CLI entrypoint via --help invocation.';
}

async function ensureBootstrapperExists(
	bootstrapperPath: string,
	access: Access
): Promise<boolean> {
	try {
		await access(bootstrapperPath);
		return true;
	} catch (error) {
		if (noEntry(error)) {
			return false;
		}

		throw error;
	}
}

async function runBootstrapper(
	bootstrapperPath: string,
	dependencies: BootstrapperResolutionDependencies
): Promise<BootstrapperRunResult> {
	const tmpDir = await dependencies.mkdtemp(
		path.join(os.tmpdir(), 'wpk-bootstrapper-')
	);

	const command = process.execPath;
	const args = [bootstrapperPath, '--', '--help'];
	const env = {
		...process.env,
		WPK_CLI_FORCE_SOURCE: '0',
	} satisfies NodeJS.ProcessEnv;

	try {
		const startedAt = performance.now();
		const { stdout, stderr } = await dependencies.exec(command, args, {
			cwd: tmpDir,
			env,
		});
		const durationMs = Math.round(performance.now() - startedAt);

		return { durationMs, stdout, stderr } satisfies BootstrapperRunResult;
	} catch (error) {
		const failure = error as NodeJS.ErrnoException & {
			stdout?: string;
			stderr?: string;
			code?: number | string;
			signal?: NodeJS.Signals;
		};

		throw new EnvironmentalError('bootstrapper.resolve', {
			message: 'Bootstrapper failed to resolve bundled CLI dependencies.',
			data: {
				command: [command, ...args],
				cwd: tmpDir,
				exitCode:
					typeof failure.code === 'number' ? failure.code : undefined,
				signal: failure.signal,
				stdout: failure.stdout,
				stderr: failure.stderr,
			},
		});
	} finally {
		await dependencies
			.rm(tmpDir, { recursive: true, force: true })
			.catch(() => undefined);
	}
}

export function createBootstrapperResolutionReadinessHelper(
	options: BootstrapperResolutionHelperOptions = {}
) {
	const dependencies = {
		...defaultDependencies(),
		...options.dependencies,
	} satisfies BootstrapperResolutionDependencies;

	return createReadinessHelper<BootstrapperResolutionState>({
		key: 'bootstrapper-resolution',
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<BootstrapperResolutionState>> {
			const repoRoot = await resolveRepoRoot(
				context.environment.projectRoot,
				dependencies.access
			);
			const bootstrapperPath = buildBootstrapperPath(repoRoot);

			const exists = await ensureBootstrapperExists(
				bootstrapperPath,
				dependencies.access
			);

			if (!exists) {
				return {
					status: 'pending',
					state: { repoRoot, bootstrapperPath },
					message:
						'Missing compiled bootstrapper entry at packages/create-wpk/dist/index.js.',
				} satisfies ReadinessDetection<BootstrapperResolutionState>;
			}

			const run = await runBootstrapper(bootstrapperPath, dependencies);

			return {
				status: 'ready',
				state: { repoRoot, bootstrapperPath, lastRun: run },
				message: buildSuccessMessage(run),
			} satisfies ReadinessDetection<BootstrapperResolutionState>;
		},
		async confirm(
			_context: DxContext,
			state: BootstrapperResolutionState
		): Promise<ReadinessConfirmation<BootstrapperResolutionState>> {
			const exists = await ensureBootstrapperExists(
				state.bootstrapperPath,
				dependencies.access
			);
			const status: ReadinessStatus =
				exists && state.lastRun ? 'ready' : 'pending';

			return {
				status: status === 'ready' ? 'ready' : 'pending',
				state,
				message: buildSuccessMessage(state.lastRun),
			} satisfies ReadinessConfirmation<BootstrapperResolutionState>;
		},
	});
}
