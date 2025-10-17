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

	async function prettyPrint(
		payload: PhpPrettyPrintOptions
	): Promise<PhpPrettyPrintResult> {
		const { workspace } = options;
		const child = spawn(
			phpBinary,
			[scriptPath, workspace.root, payload.filePath],
			{
				cwd: workspace.root,
			}
		);

		const input = JSON.stringify({
			file: payload.filePath,
			ast: payload.ast ?? null,
			legacyAst: payload.legacyAst ?? null,
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

		const exitCode: number = await new Promise((resolve, reject) => {
			child.on('error', reject);
			child.on('close', resolve);
			child.stdin.on('error', reject);
			child.stdin.end(input, 'utf8');
		});

		if (exitCode !== 0) {
			throw new KernelError('DeveloperError', {
				message: 'Failed to pretty print PHP artifacts.',
				data: {
					filePath: payload.filePath,
					exitCode,
					stderr,
				},
			});
		}

		try {
			const raw = JSON.parse(stdout) as {
				code?: unknown;
				ast?: unknown;
			};

			if (typeof raw.code !== 'string') {
				throw new Error('Missing code payload');
			}

			const result: PhpPrettyPrintResult = {
				code: raw.code,
				ast: raw.ast as PhpPrettyPrintResult['ast'],
			};

			return result;
		} catch (error) {
			throw new KernelError('DeveloperError', {
				message:
					'Failed to parse pretty printer response for PHP artifacts.',
				data: {
					filePath: payload.filePath,
					stderr,
					stdout,
					error:
						error instanceof Error
							? { message: error.message }
							: undefined,
				},
			});
		}
	}

	return {
		prettyPrint,
	};
}
