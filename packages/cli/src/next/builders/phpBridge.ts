import path from 'node:path';
import { spawn } from 'node:child_process';
import { KernelError } from '@wpkernel/core/error';
import type { Workspace } from '../workspace/types';
import type {
	PhpPrettyPrintOptions,
	PhpPrettyPrintResult,
} from '../../printers/types';

interface CreatePhpPrettyPrinterOptions {
	readonly workspace: Workspace;
	readonly phpBinary?: string;
	readonly scriptPath?: string;
}

interface PhpPrettyPrinter {
	prettyPrint: (
		payload: PhpPrettyPrintOptions
	) => Promise<PhpPrettyPrintResult>;
}

function resolveDefaultScriptPath(): string {
	return path.resolve(__dirname, '../../..', 'php', 'pretty-print.php');
}

export function createPhpPrettyPrinter(
	options: CreatePhpPrettyPrinterOptions
): PhpPrettyPrinter {
	const scriptPath = options.scriptPath ?? resolveDefaultScriptPath();
	const phpBinary = options.phpBinary ?? 'php';
	const defaultMemoryLimit = process.env.PHP_MEMORY_LIMIT ?? '512M';

	async function prettyPrint(
		payload: PhpPrettyPrintOptions
	): Promise<PhpPrettyPrintResult> {
		ensureValidPayload(payload);

		const { workspace } = options;
		const memoryLimit = resolveMemoryLimit(defaultMemoryLimit);

		// `spawn` handles argument quoting for Windows executables, so no extra
		// escaping is required when passing the PHP binary path.
		const child = spawn(
			phpBinary,
			[
				'-d',
				`memory_limit=${memoryLimit}`,
				scriptPath,
				workspace.root,
				payload.filePath,
			],
			{
				cwd: workspace.root,
				env: {
					...process.env,
					PHP_MEMORY_LIMIT: memoryLimit,
				},
			}
		);

		const input = JSON.stringify({
			file: payload.filePath,
			ast: payload.ast ?? null,
			code: payload.code ?? null,
		});

		let stdout = '';
		let stderr = '';

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');

		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});

		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});

		const exitCode = await waitForBridgeExit(child, input, {
			phpBinary,
			scriptPath,
		});

		if (exitCode !== 0) {
			throw new KernelError('DeveloperError', {
				message: 'Failed to pretty print PHP artifacts.',
				data: {
					filePath: payload.filePath,
					exitCode,
					stderr,
					stderrSummary: collectStderrSummary(stderr),
				},
			});
		}

		return parseBridgeOutput(stdout, {
			filePath: payload.filePath,
			stderr,
		});
	}

	return {
		prettyPrint,
	};
}

function ensureValidPayload(payload: PhpPrettyPrintOptions): void {
	const hasCode = typeof payload.code === 'string';
	const hasAst = payload.ast !== undefined && payload.ast !== null;

	if (Number(hasCode) + Number(hasAst) !== 1) {
		throw new KernelError('DeveloperError', {
			message:
				'PHP pretty printer requires exactly one of code or AST payloads.',
			data: {
				filePath: payload.filePath,
				hasCode,
				hasAst,
			},
		});
	}
}

function resolveMemoryLimit(defaultMemoryLimit: string): string {
	const envLimit = process.env.PHP_MEMORY_LIMIT;
	return typeof envLimit === 'string' && envLimit !== ''
		? envLimit
		: defaultMemoryLimit;
}

async function waitForBridgeExit(
	child: ReturnType<typeof spawn>,
	input: string,
	meta: { phpBinary: string; scriptPath: string }
): Promise<number> {
	return new Promise((resolve, reject) => {
		let settled = false;
		const settleResolve = (value: number) => {
			if (!settled) {
				settled = true;
				resolve(value);
			}
		};
		const settleReject = (error: unknown) => {
			if (!settled) {
				settled = true;
				reject(error);
			}
		};

		child.on('error', (error) => {
			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				(error as NodeJS.ErrnoException).code === 'ENOENT'
			) {
				settleReject(
					new KernelError('DeveloperError', {
						message:
							'PHP pretty printer is missing required dependencies.',
						data: meta,
					})
				);
				return;
			}

			settleReject(error);
		});
		child.on('close', (code) =>
			settleResolve(typeof code === 'number' ? code : 1)
		);

		const stdin = child.stdin;
		if (!stdin) {
			settleReject(
				new KernelError('DeveloperError', {
					message:
						'PHP pretty printer child process did not expose a writable stdin.',
					data: meta,
				})
			);
			return;
		}

		stdin.on('error', (error) => settleReject(error));
		stdin.end(input, 'utf8');
	});
}

function collectStderrSummary(stderr: string): string[] {
	return stderr
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 3);
}

function parseBridgeOutput(
	stdout: string,
	context: { filePath: string; stderr: string }
): PhpPrettyPrintResult {
	try {
		const raw = JSON.parse(stdout) as {
			code?: unknown;
			ast?: unknown;
		};

		if (typeof raw.code !== 'string') {
			throw new Error('Missing code payload');
		}

		return {
			code: raw.code,
			ast: raw.ast as PhpPrettyPrintResult['ast'],
		};
	} catch (error) {
		throw new KernelError('DeveloperError', {
			message:
				'Failed to parse pretty printer response for PHP artifacts.',
			data: {
				filePath: context.filePath,
				stderr: context.stderr,
				stdout,
				error:
					error instanceof Error
						? { message: error.message }
						: undefined,
			},
		});
	}
}
