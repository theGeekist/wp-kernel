import { spawn as spawnProcess } from 'node:child_process';
import { WPKernelError } from '@wpkernel/core/error';

export interface InstallerDependencies {
	readonly spawn?: typeof spawnProcess;
}

export interface InstallerResult {
	stdout: string;
	stderr: string;
}

export async function installNodeDependencies(
	cwd: string,
	dependencies: InstallerDependencies = {}
): Promise<InstallerResult> {
	return runInstallerCommand(
		{
			command: 'npm',
			args: ['install'],
			cwd,
			errorMessage: 'Failed to install npm dependencies.',
		},
		dependencies
	);
}

export async function installComposerDependencies(
	cwd: string,
	dependencies: InstallerDependencies = {}
): Promise<InstallerResult> {
	return runInstallerCommand(
		{
			command: 'composer',
			args: ['install'],
			cwd,
			errorMessage: 'Failed to install composer dependencies.',
		},
		dependencies
	);
}

async function runInstallerCommand(
	{
		command,
		args,
		cwd,
		errorMessage,
	}: {
		command: string;
		args: readonly string[];
		cwd: string;
		errorMessage: string;
	},
	{ spawn = spawnProcess }: InstallerDependencies
): Promise<InstallerResult> {
	let capturedStdout = '';
	let capturedStderr = '';

	const child = spawn(command, args, {
		cwd,
		stdio: ['inherit', 'pipe', 'pipe'],
	});

	child.stdout?.on('data', (chunk) => {
		const value = chunk.toString();
		capturedStdout += value;
		process.stdout.write(value);
	});

	child.stderr?.on('data', (chunk) => {
		const value = chunk.toString();
		capturedStderr += value;
		process.stderr.write(value);
	});

	return new Promise<InstallerResult>((resolve, reject) => {
		const handleError = (error: unknown) => {
			reject(
				new WPKernelError('DeveloperError', {
					message: errorMessage,
					context: serialiseSpawnError(error),
				})
			);
		};

		child.on('error', handleError);
		child.on('close', (code, signal) => {
			if (code === 0) {
				resolve({
					stdout: capturedStdout,
					stderr: capturedStderr,
				});
				return;
			}

			handleError({
				message:
					typeof code === 'number'
						? `${command} exited with code ${code}`
						: `Process terminated by signal ${signal}`,
				exitCode: code ?? undefined,
				signal: signal ?? undefined,
			});
		});
	});
}

function serialiseSpawnError(error: unknown): {
	message: string;
	exitCode?: number;
	signal?: NodeJS.Signals;
} {
	if (!error || typeof error !== 'object') {
		return { message: String(error) };
	}

	const message = String((error as { message?: unknown }).message ?? error);
	const exitCode = (error as { exitCode?: unknown }).exitCode;
	const signal = (error as { signal?: unknown }).signal;

	return {
		message,
		exitCode:
			typeof exitCode === 'number' && Number.isFinite(exitCode)
				? exitCode
				: undefined,
		signal:
			typeof signal === 'string' ? (signal as NodeJS.Signals) : undefined,
	};
}
