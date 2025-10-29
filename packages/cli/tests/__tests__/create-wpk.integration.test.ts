import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { withWorkspace } from '../workspace.test-support';

jest.setTimeout(30000);

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CREATE_WPK_ROOT = path.join(REPO_ROOT, 'packages', 'create-wpk');
const BOOTSTRAP_BIN = path.join(CREATE_WPK_ROOT, 'dist', 'index.js');
const CLI_LOADER = path.resolve(
	__dirname,
	'../test-support/wpk-cli-loader.mjs'
);
const TSC_BIN: string = require.resolve('typescript/bin/tsc');

interface RunResult {
	code: number;
	stdout: string;
	stderr: string;
}

interface RunOptions {
	cwd: string;
	env?: NodeJS.ProcessEnv;
}

interface BootstrapRunOptions {
	env?: NodeJS.ProcessEnv;
}

async function hasPath(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return false;
		}
		throw error;
	}
}

async function ensureBootstrapBinary(): Promise<void> {
	if (await hasPath(BOOTSTRAP_BIN)) {
		return;
	}

	const tsconfigPath = path.join(CREATE_WPK_ROOT, 'tsconfig.json');
	await execFileAsync(process.execPath, [TSC_BIN, '-p', tsconfigPath], {
		cwd: REPO_ROOT,
	});

	if (!(await hasPath(BOOTSTRAP_BIN))) {
		throw new Error('Expected create-wpk bootstrap binary to be built.');
	}
}

function runProcess(
	command: string,
	args: string[],
	options: RunOptions
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

function runCreateWpk(
	workspace: string,
	args: string[],
	options: BootstrapRunOptions = {}
): Promise<RunResult> {
	const env: NodeJS.ProcessEnv = {
		...process.env,
		...options.env,
		NODE_ENV: 'test',
		FORCE_COLOR: '0',
	};

	const existingNodeOptions = env.NODE_OPTIONS ?? '';
	const segments: string[] = [];
	if (existingNodeOptions.length > 0) {
		segments.push(existingNodeOptions);
	}
	segments.push('--no-warnings');
	segments.push(`--loader ${CLI_LOADER}`);
	env.NODE_OPTIONS = segments.join(' ');

	return runProcess(process.execPath, [BOOTSTRAP_BIN, ...args], {
		cwd: workspace,
		env,
	});
}

describe('@wpkernel/create-wpk integration', () => {
	beforeAll(async () => {
		await ensureBootstrapBinary();
	});

	it('forwards positional targets and flags into wpk create', async () => {
		await withWorkspace(
			async (workspace) => {
				const targetDirectory = 'bootstrap-plugin';
				const pluginSlug = 'bootstrap-plugin';
				const result = await runCreateWpk(workspace, [
					targetDirectory,
					'--',
					'--skip-install',
					'--name',
					pluginSlug,
				]);

				const combinedOutput = `${result.stdout}${result.stderr}`;
				expect(combinedOutput).not.toContain(
					'Installing npm dependencies...'
				);
				expect(combinedOutput).not.toContain(
					'Installing composer dependencies...'
				);
				expect(result.stdout).toContain(
					`created plugin scaffold for ${pluginSlug}`
				);

				const projectRoot = path.join(workspace, targetDirectory);
				const packageJsonPath = path.join(projectRoot, 'package.json');
				const composerJsonPath = path.join(
					projectRoot,
					'composer.json'
				);
				const configPath = path.join(projectRoot, 'wpk.config.ts');
				const nodeModulesPath = path.join(projectRoot, 'node_modules');

				expect(await hasPath(packageJsonPath)).toBe(true);
				expect(await hasPath(composerJsonPath)).toBe(true);
				expect(await hasPath(configPath)).toBe(true);
				expect(await hasPath(nodeModulesPath)).toBe(false);

				const packageJson = JSON.parse(
					await fs.readFile(packageJsonPath, 'utf8')
				);
				expect(packageJson).toMatchObject({
					name: pluginSlug,
					private: true,
				});

				const composerJson = JSON.parse(
					await fs.readFile(composerJsonPath, 'utf8')
				);
				expect(composerJson.name).toBe(`${pluginSlug}/${pluginSlug}`);

				const configSource = await fs.readFile(configPath, 'utf8');
				expect(configSource).toContain(`namespace: '${pluginSlug}'`);
			},
			{ chdir: false }
		);
	});
});
