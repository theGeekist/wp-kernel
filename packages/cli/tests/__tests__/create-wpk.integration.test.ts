import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { withWorkspace } from '../workspace.test-support';
import {
	buildCliIntegrationEnv,
	runNodeProcess,
	type RunProcessResult,
} from '@wpkernel/test-utils/integration';

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

function runCreateWpk(
	workspace: string,
	args: string[],
	options: BootstrapRunOptions = {}
): Promise<RunProcessResult> {
	const env = buildCliIntegrationEnv(process.env, options.env);

	return runNodeProcess(BOOTSTRAP_BIN, args, {
		cwd: workspace,
		env,
		loader: CLI_LOADER,
		noWarnings: true,
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
