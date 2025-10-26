import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { KernelError } from '@wpkernel/core/error';
import type {
	DriverWorkspace,
	PhpPrettyPrintPayload,
	PhpPrettyPrintResult,
	PhpPrettyPrinter,
} from './types';

export interface CreatePhpPrettyPrinterOptions {
	readonly workspace: DriverWorkspace;
	readonly phpBinary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
}

function resolveDefaultScriptPath(
	options: {
		readonly importMetaUrl?: string;
	} = {}
): string {
	if (typeof options.importMetaUrl === 'string') {
		const scriptFromImportMeta = resolveScriptPathFromImportMeta(
			options.importMetaUrl
		);
		if (scriptFromImportMeta) {
			return scriptFromImportMeta;
		}
	}

	if (typeof __dirname === 'string') {
		return path.resolve(__dirname, '..', 'php', 'pretty-print.php');
	}

	const moduleUrl = getImportMetaUrl();
	if (moduleUrl) {
		const scriptFromImportMeta = resolveScriptPathFromImportMeta(moduleUrl);
		if (scriptFromImportMeta) {
			return scriptFromImportMeta;
		}
	}

	return path.resolve(process.cwd(), 'php', 'pretty-print.php');
}

function resolveScriptPathFromImportMeta(importMetaUrl: string): string | null {
	try {
		const modulePath = fileURLToPath(importMetaUrl);
		const currentDirectory = path.dirname(modulePath);
		const initialParent = path.resolve(currentDirectory, '..');
		const packageRoot =
			path.basename(initialParent) === 'dist'
				? path.resolve(initialParent, '..')
				: initialParent;
		return path.resolve(packageRoot, 'php', 'pretty-print.php');
	} catch {
		return null;
	}
}

let cachedImportMetaUrl: string | null | undefined;

function getImportMetaUrl(): string | null {
	if (cachedImportMetaUrl !== undefined) {
		return cachedImportMetaUrl;
	}

	cachedImportMetaUrl = resolveModuleUrlFromStack();
	return cachedImportMetaUrl;
}

function resolveModuleUrlFromStack(): string | null {
	const originalPrepareStackTrace = Error.prepareStackTrace;

	try {
		Error.prepareStackTrace = (_, structuredStackTrace) =>
			structuredStackTrace;
		const callSites = new Error().stack as unknown as
			| ReadonlyArray<NodeJS.CallSite>
			| undefined;

		if (!Array.isArray(callSites)) {
			return null;
		}

		for (const callSite of callSites) {
			const fileName = callSite.getFileName?.();
			if (typeof fileName !== 'string') {
				continue;
			}

			if (fileName.startsWith('file:')) {
				return fileName;
			}

			if (path.isAbsolute(fileName)) {
				return pathToFileURL(fileName).href;
			}
		}

		return null;
	} catch {
		return null;
	} finally {
		Error.prepareStackTrace = originalPrepareStackTrace;
	}
}

export function buildPhpPrettyPrinter(
	options: CreatePhpPrettyPrinterOptions
): PhpPrettyPrinter {
	const scriptPath =
		options.scriptPath ??
		resolveDefaultScriptPath({ importMetaUrl: options.importMetaUrl });
	const phpBinary = options.phpBinary ?? 'php';
	const defaultMemoryLimit = process.env.PHP_MEMORY_LIMIT ?? '512M';

	async function prettyPrint(
		payload: PhpPrettyPrintPayload
	): Promise<PhpPrettyPrintResult> {
		ensureValidPayload(payload);

		const { workspace } = options;
		const memoryLimit = resolveMemoryLimit(defaultMemoryLimit);

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
			ast: payload.program,
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

function ensureValidPayload(payload: PhpPrettyPrintPayload): void {
	const { program } = payload;

	if (!Array.isArray(program)) {
		throw new KernelError('DeveloperError', {
			message: 'PHP pretty printer requires an AST payload.',
			data: {
				filePath: payload.filePath,
			},
		});
	}

	program.forEach((node, index) => {
		if (!node || typeof node !== 'object') {
			throw makeInvalidNodeError(payload.filePath, index);
		}

		const nodeType = (node as { nodeType?: unknown }).nodeType;
		if (typeof nodeType !== 'string' || nodeType.length === 0) {
			throw makeInvalidNodeError(payload.filePath, index);
		}
	});
}

function makeInvalidNodeError(filePath: string, index: number): KernelError {
	return new KernelError('DeveloperError', {
		message:
			'PHP pretty printer requires AST nodes with a string nodeType.',
		data: {
			filePath,
			invalidNodeIndex: index,
		},
	});
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
		if (!raw.ast) {
			throw new Error('Missing AST payload');
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
