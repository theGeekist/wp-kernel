import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export interface ResolvePhpCodemodIngestionScriptOptions {
	readonly importMetaUrl?: string;
}

export interface RunPhpCodemodIngestionOptions {
	readonly workspaceRoot: string;
	readonly files: readonly string[];
	readonly phpBinary?: string;
	readonly scriptPath?: string;
	readonly configurationPath?: string;
	readonly enableDiagnostics?: boolean;
	readonly importMetaUrl?: string;
}

export interface PhpCodemodIngestionResult {
	readonly lines: readonly string[];
	readonly exitCode: number;
	readonly stderr: string;
}

const DEFAULT_IMPORT_META_URL = resolveImportMetaUrl();

export function resolvePhpCodemodIngestionScriptPath(
	options: ResolvePhpCodemodIngestionScriptOptions = {}
): string {
	const candidates: (string | null)[] = [];
	const importMetaUrl = options.importMetaUrl ?? DEFAULT_IMPORT_META_URL;

	if (importMetaUrl) {
		candidates.push(resolveFromImportMeta(importMetaUrl));
	}

	candidates.push(resolveFromPackageRoot(importMetaUrl));

	if (typeof __dirname === 'string') {
		candidates.push(
			path.resolve(__dirname, '..', '..', 'php', 'ingest-program.php')
		);
	}

	candidates.push(resolveFromPackageRoot(undefined));
	candidates.push(resolveFromProcessCwd());

	for (const candidate of candidates) {
		if (candidate) {
			return candidate;
		}
	}

	return path.resolve(process.cwd(), 'php', 'ingest-program.php');
}

export async function runPhpCodemodIngestion(
	options: RunPhpCodemodIngestionOptions
): Promise<PhpCodemodIngestionResult> {
	const files = Array.from(
		new Set(options.files.filter((file) => typeof file === 'string'))
	);
	if (files.length === 0) {
		return { lines: [], exitCode: 0, stderr: '' };
	}

	const scriptPath =
		options.scriptPath ??
		resolvePhpCodemodIngestionScriptPath({
			importMetaUrl: options.importMetaUrl,
		});

	const args = [scriptPath, options.workspaceRoot];

	if (options.configurationPath) {
		args.push('--config', options.configurationPath);
	}

	if (options.enableDiagnostics) {
		args.push('--diagnostics');
	}

	args.push(...files);

	const phpBinary = options.phpBinary ?? 'php';
	const child = spawn(phpBinary, args, {
		cwd: options.workspaceRoot,
	});

	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];

	if (child.stdout) {
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk: string) => {
			stdoutChunks.push(chunk);
		});
	}

	if (child.stderr) {
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk: string) => {
			stderrChunks.push(chunk);
		});
	}

	const exitCode = await waitForChild(child);
	const stdout = stdoutChunks.join('');
	const stderr = stderrChunks.join('');

	return {
		lines: stdout
			.split(/\r?\n/u)
			.map((line) => line.trim())
			.filter((line) => line.length > 0),
		exitCode: exitCode ?? 0,
		stderr,
	};
}

function resolveFromImportMeta(
	importMetaUrl: string | undefined
): string | null {
	if (!importMetaUrl) {
		return null;
	}

	try {
		const modulePath = new URL(importMetaUrl);
		if (modulePath.protocol !== 'file:') {
			return null;
		}

		const resolvedPath = fileURLToPath(modulePath);
		const candidate = path.resolve(
			resolvedPath,
			'..',
			'..',
			'php',
			'ingest-program.php'
		);
		return candidate;
	} catch {
		return null;
	}
}

function resolveFromPackageRoot(
	importMetaUrl: string | undefined
): string | null {
	try {
		const modulePath = resolveModuleFilePath(importMetaUrl);
		const require = createRequire(
			modulePath ?? path.join(process.cwd(), 'index.js')
		);
		const packageJsonPath = require.resolve(
			'@wpkernel/php-json-ast/package.json'
		);
		return path.resolve(
			path.dirname(packageJsonPath),
			'php',
			'ingest-program.php'
		);
	} catch {
		return null;
	}
}

function resolveFromProcessCwd(): string {
	return path.resolve(process.cwd(), 'php', 'ingest-program.php');
}

function waitForChild(child: ReturnType<typeof spawn>): Promise<number | null> {
	return new Promise((resolve, reject) => {
		let settled = false;

		const settleResolve = (code: number | null) => {
			if (!settled) {
				settled = true;
				resolve(code);
			}
		};

		const settleReject = (error: unknown) => {
			if (!settled) {
				settled = true;
				reject(error);
			}
		};

		child.once('error', (error) => settleReject(error));
		child.once('close', (code) => settleResolve(code));
	});
}

function resolveImportMetaUrl(): string | undefined {
	try {
		// eslint-disable-next-line no-eval -- evaluated lazily to avoid syntax errors when transpiled to CJS
		return (0, eval)(
			'import.meta && import.meta.url ? import.meta.url : undefined'
		);
	} catch {
		return undefined;
	}
}

function resolveModuleFilePath(
	importMetaUrl: string | undefined
): string | null {
	if (importMetaUrl) {
		try {
			return fileURLToPath(importMetaUrl);
		} catch {
			// fall through to other strategies
		}
	}

	if (typeof __filename === 'string') {
		return __filename;
	}

	return null;
}
