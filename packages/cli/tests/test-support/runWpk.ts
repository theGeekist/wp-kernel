import { spawn } from 'node:child_process';
import path from 'node:path';
import packageJson from '../../package.json' assert { type: 'json' };
import { buildPhpIntegrationEnv } from '../workspace.test-support';

type RunResult = {
	code: number;
	stdout: string;
	stderr: string;
};

type RunOptions = {
	env?: NodeJS.ProcessEnv;
};

const PHP_AUTOLOAD_ENV_KEYS = [
	'WPK_PHP_AUTOLOAD',
	'WPK_PHP_AUTOLOAD_PATHS',
	'PHP_DRIVER_AUTOLOAD',
	'PHP_DRIVER_AUTOLOAD_PATHS',
] as const;

function sanitizePhpAutoloadEnv(
	baseEnv: NodeJS.ProcessEnv,
	overrides: NodeJS.ProcessEnv | undefined
): NodeJS.ProcessEnv {
	const sanitized: NodeJS.ProcessEnv = { ...baseEnv };

	for (const key of PHP_AUTOLOAD_ENV_KEYS) {
		if (key in sanitized) {
			delete sanitized[key];
		}
	}

	if (overrides) {
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined) {
				delete sanitized[key];
			} else {
				sanitized[key] = value;
			}
		}
	}

	return sanitized;
}

type PackageJson = {
	bin?: Record<string, string> | undefined;
};

function resolveCliBinPath(): string {
	const { bin } = packageJson as PackageJson;
	if (bin) {
		const explicit = bin.wpk;
		if (typeof explicit === 'string' && explicit.length > 0) {
			return explicit;
		}

		for (const candidate of Object.values(bin)) {
			if (typeof candidate === 'string' && candidate.length > 0) {
				return candidate;
			}
		}
	}

	throw new Error('Unable to resolve CLI bin entry from package.json');
}

const CLI_BIN = path.resolve(__dirname, '..', '..', resolveCliBinPath());
const CLI_LOADER = path.resolve(__dirname, 'wpk-cli-loader.mjs');

function runProcess(
	command: string,
	args: string[],
	options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr?.on('data', (chunk) => {
			stderr += chunk.toString();
		});

		child.once('error', reject);
		child.once('close', (code) => {
			resolve({
				code: code ?? 0,
				stdout,
				stderr,
			});
		});
	});
}

export function runWpk(
	workspace: string,
	args: string[],
	options: RunOptions = {}
): Promise<RunResult> {
	const mergedEnv = sanitizePhpAutoloadEnv(process.env, {
		...options.env,
		NODE_ENV: 'test',
		FORCE_COLOR: '0',
	});
	const env = buildPhpIntegrationEnv(mergedEnv);

	const existingNodeOptions = env.NODE_OPTIONS ?? '';
	const segments: string[] = [];
	if (existingNodeOptions.length > 0) {
		segments.push(existingNodeOptions);
	}
	segments.push('--no-warnings');
	segments.push(`--loader ${CLI_LOADER}`);
	env.NODE_OPTIONS = segments.join(' ');

	return runProcess(process.execPath, [CLI_BIN, ...args], {
		cwd: workspace,
		env,
	});
}
