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
import { EnvironmentalError } from '@wpkernel/core/error';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';
import { createModuleResolver } from '../../../utils/module-url';

const execFile = promisify(execFileCallback);

type ExecFile = typeof execFile;
type MkdirTemp = typeof mkdtempFs;
type Remove = typeof rmFs;
type Access = typeof accessFs;
type ResolveModule = ReturnType<typeof createModuleResolver>;

type CommandArgs = readonly string[];

interface CommandRunResult {
	readonly command: CommandArgs;
	readonly cwd: string;
	readonly durationMs: number;
	readonly stdout: string;
	readonly stderr: string;
}

export interface QuickstartRunResult {
	readonly workspaceRoot: string;
	readonly projectRoot: string;
	readonly cliBinaryPath: string;
	readonly tsxModulePath: string;
	readonly create: CommandRunResult;
	readonly generate: CommandRunResult;
}

export interface QuickstartState {
	readonly run: QuickstartRunResult | null;
}

export interface QuickstartDependencies {
	readonly mkdtemp: MkdirTemp;
	readonly rm: Remove;
	readonly access: Access;
	readonly exec: ExecFile;
	readonly resolve: ResolveModule;
}

export interface QuickstartHelperOptions {
	readonly dependencies?: Partial<QuickstartDependencies>;
}

function defaultDependencies(): QuickstartDependencies {
	return {
		mkdtemp: mkdtempFs,
		rm: rmFs,
		access: accessFs,
		exec: execFile,
		resolve: createModuleResolver(),
	} satisfies QuickstartDependencies;
}

function buildQuickstartDirectory(root: string): string {
	return path.join(root, 'quickstart');
}

function buildBinaryCandidates(projectRoot: string): string[] {
	const binDir = path.join(projectRoot, 'node_modules', '.bin');
	const base = path.join(binDir, 'wpk');

	if (process.platform === 'win32') {
		return [`${base}.cmd`, `${base}.ps1`, base];
	}

	return [base];
}

function isENOENT(error: unknown): boolean {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: string }) &&
		(error as { code?: string }).code === 'ENOENT'
	);
}

function isModuleNotFoundTsx(message: string): boolean {
	const lower = message.toLowerCase();
	return (
		lower.includes("cannot find module 'tsx'") ||
		lower.includes('module \"tsx\"') ||
		lower.includes("can't resolve 'tsx'")
	);
}

async function ensureCliBinary(
	projectRoot: string,
	dependencies: QuickstartDependencies
): Promise<string> {
	const candidates = buildBinaryCandidates(projectRoot);

	for (const candidate of candidates) {
		try {
			await dependencies.access(candidate);
			return candidate;
		} catch (error) {
			if (isENOENT(error)) {
				continue;
			}

			throw error;
		}
	}

	throw new EnvironmentalError('cli.binary.missing', {
		message: 'Quickstart scaffold did not install the wpk binary.',
		data: {
			projectRoot,
			candidates,
		},
	});
}

async function ensureTsxRuntime(
	projectRoot: string,
	dependencies: QuickstartDependencies
): Promise<string> {
	try {
		return dependencies.resolve('tsx', {
			paths: [path.join(projectRoot, 'node_modules')],
		});
	} catch (error) {
		if (isModuleNotFoundTsx(String((error as Error).message ?? ''))) {
			throw new EnvironmentalError('tsx.missing', {
				message: 'Quickstart scaffold missing tsx runtime.',
				data: { projectRoot },
			});
		}

		throw error;
	}
}

async function runCommand(
	command: string,
	args: CommandArgs,
	options: { cwd: string; env?: NodeJS.ProcessEnv },
	dependencies: QuickstartDependencies
): Promise<CommandRunResult> {
	const startedAt = performance.now();

	try {
		const { stdout, stderr } = await dependencies.exec(
			command,
			args,
			options
		);
		return {
			command: [command, ...args],
			cwd: options.cwd,
			durationMs: Math.round(performance.now() - startedAt),
			stdout,
			stderr,
		} satisfies CommandRunResult;
	} catch (error) {
		const failure = error as NodeJS.ErrnoException & {
			stdout?: string;
			stderr?: string;
		};

		if (failure.code === 'ENOENT') {
			throw new EnvironmentalError('cli.binary.missing', {
				message: 'wpk binary unavailable when executing quickstart.',
				data: {
					command: [command, ...args],
					cwd: options.cwd,
				},
			});
		}

		const output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
		if (isModuleNotFoundTsx(output)) {
			throw new EnvironmentalError('tsx.missing', {
				message:
					'wpk generate failed because tsx runtime was not installed.',
				data: {
					command: [command, ...args],
					cwd: options.cwd,
					stdout: failure.stdout,
					stderr: failure.stderr,
				},
			});
		}

		throw new EnvironmentalError('cli.quickstart.failed', {
			message: 'Quickstart command execution failed.',
			data: {
				command: [command, ...args],
				cwd: options.cwd,
				stdout: failure.stdout,
				stderr: failure.stderr,
				code: failure.code,
			},
		});
	}
}

async function runQuickstart(
	dependencies: QuickstartDependencies
): Promise<QuickstartRunResult> {
	const workspaceRoot = await dependencies.mkdtemp(
		path.join(os.tmpdir(), 'wpk-quickstart-')
	);
	const projectRoot = buildQuickstartDirectory(workspaceRoot);

	try {
		const create = await runCommand(
			'npm',
			['create', '@wpkernel/wpk', 'quickstart'],
			{
				cwd: workspaceRoot,
				env: {
					...process.env,
					npm_config_yes: 'true',
					npm_config_progress: 'false',
				},
			},
			dependencies
		);

		const cliBinaryPath = await ensureCliBinary(projectRoot, dependencies);
		const tsxModulePath = await ensureTsxRuntime(projectRoot, dependencies);

		const generate = await runCommand(
			cliBinaryPath,
			['generate'],
			{
				cwd: projectRoot,
				env: {
					...process.env,
					PATH: `${path.dirname(cliBinaryPath)}${path.delimiter}${
						process.env.PATH ?? ''
					}`,
				},
			},
			dependencies
		);

		return {
			workspaceRoot,
			projectRoot,
			cliBinaryPath,
			tsxModulePath,
			create,
			generate,
		} satisfies QuickstartRunResult;
	} finally {
		await dependencies
			.rm(workspaceRoot, { recursive: true, force: true })
			.catch(() => undefined);
	}
}

function buildSuccessMessage(run: QuickstartRunResult): string {
	return `Quickstart scaffolding verified via npm create (${run.create.durationMs}ms) and wpk generate (${run.generate.durationMs}ms).`;
}

export function createQuickstartReadinessHelper(
	options: QuickstartHelperOptions = {}
): ReadinessHelper<QuickstartState> {
	const dependencies = {
		...defaultDependencies(),
		...options.dependencies,
	} satisfies QuickstartDependencies;

	return createReadinessHelper<QuickstartState>({
		key: 'quickstart',
		metadata: {
			label: 'Quickstart scaffold',
			description:
				'Runs the published quickstart flow to ensure bundled assets install correctly.',
			tags: ['scaffold', 'packaging'],
			scopes: ['doctor'],
			order: 110,
		},
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<QuickstartState>> {
			const run = await runQuickstart(dependencies);

			context.reporter.info(
				`Quickstart create completed in ${run.create.durationMs}ms; ` +
					`wpk generate completed in ${run.generate.durationMs}ms.`
			);
			context.reporter.debug('Resolved wpk binary.', {
				path: run.cliBinaryPath,
			});
			context.reporter.debug('Resolved tsx runtime.', {
				path: run.tsxModulePath,
			});

			return {
				status: 'ready',
				state: { run },
				message: buildSuccessMessage(run),
			} satisfies ReadinessDetection<QuickstartState>;
		},
		async confirm(
			_context: DxContext,
			state: QuickstartState
		): Promise<ReadinessConfirmation<QuickstartState>> {
			const run = state.run;

			if (!run) {
				return {
					status: 'pending',
					state,
					message: 'Quickstart execution has not completed yet.',
				} satisfies ReadinessConfirmation<QuickstartState>;
			}

			return {
				status: 'ready',
				state,
				message: buildSuccessMessage(run),
			} satisfies ReadinessConfirmation<QuickstartState>;
		},
	});
}
