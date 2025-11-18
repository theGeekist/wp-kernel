import path from 'node:path';
import { type EnvironmentalError } from '@wpkernel/core/error';
import { createBootstrapperResolutionReadinessHelper } from '../bootstrapperResolution';
import {
	createReadinessTestContext,
	makeNoEntry,
} from '@cli-tests/readiness.test-support';

const repoRoot = '/repo';
const projectRoot = path.join(repoRoot, 'packages', 'cli');
const bootstrapperPath = path.join(
	repoRoot,
	'packages',
	'create-wpk',
	'dist',
	'index.js'
);

describe('createBootstrapperResolutionReadinessHelper', () => {
	it('reports pending when the compiled bootstrapper entry is missing', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(projectRoot, 'pnpm-workspace.yaml')) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'pnpm-workspace.yaml')
			) {
				throw makeNoEntry(target);
			}

			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (target === bootstrapperPath) {
				throw makeNoEntry(target);
			}

			throw new Error(`Unexpected access: ${target}`);
		});

		const helper = createBootstrapperResolutionReadinessHelper({
			dependencies: {
				access,
				mkdtemp: jest.fn(),
				rm: jest.fn(),
				exec: jest.fn(),
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'Missing compiled bootstrapper entry at packages/create-wpk/dist/index.js.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe(
			'Bootstrapper resolution pending verification.'
		);

		expect(access).toHaveBeenCalledWith(
			path.join(repoRoot, 'pnpm-workspace.yaml')
		);
	});

	it('reports ready when the bootstrapper resolves bundled dependencies', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(projectRoot, 'pnpm-workspace.yaml')) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'pnpm-workspace.yaml')
			) {
				throw makeNoEntry(target);
			}

			if (
				target === path.join(repoRoot, 'pnpm-workspace.yaml') ||
				target === bootstrapperPath
			) {
				return undefined;
			}

			throw new Error(`Unexpected access: ${target}`);
		});

		const mkdtemp = jest.fn(async () => '/tmp/wpk-bootstrapper-123');
		const rm = jest.fn(async () => undefined);
		const exec = jest.fn(async () => ({ stdout: 'help', stderr: '' }));

		const helper = createBootstrapperResolutionReadinessHelper({
			dependencies: { access, mkdtemp, rm, exec },
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toBe(
			'Bootstrapper resolved CLI entrypoint via --help invocation.'
		);

		expect(exec).toHaveBeenCalledWith(
			process.execPath,
			[bootstrapperPath, '--', '--help'],
			expect.objectContaining({
				cwd: '/tmp/wpk-bootstrapper-123',
				env: process.env,
			})
		);

		expect(rm).toHaveBeenCalledWith('/tmp/wpk-bootstrapper-123', {
			recursive: true,
			force: true,
		});

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe(
			'Bootstrapper resolved CLI entrypoint via --help invocation.'
		);
	});

	it('throws an EnvironmentalError when bootstrapper resolution fails', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(projectRoot, 'pnpm-workspace.yaml')) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'pnpm-workspace.yaml')
			) {
				throw makeNoEntry(target);
			}

			if (
				target === path.join(repoRoot, 'pnpm-workspace.yaml') ||
				target === bootstrapperPath
			) {
				return undefined;
			}

			throw new Error(`Unexpected access: ${target}`);
		});

		const mkdtemp = jest.fn(async () => '/tmp/wpk-bootstrapper-999');
		const rm = jest.fn(async () => undefined);
		const exec = jest.fn(async () => {
			const error = new Error(
				'Cannot find module'
			) as NodeJS.ErrnoException & {
				stdout?: string;
				stderr?: string;
				code?: number;
			};
			error.code = 1;
			error.stderr = 'Cannot find module @wpkernel/cli';
			error.stdout = '';
			throw error;
		});

		const helper = createBootstrapperResolutionReadinessHelper({
			dependencies: { access, mkdtemp, rm, exec },
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		await expect(helper.detect(context)).rejects.toMatchObject({
			reason: 'bootstrapper.resolve',
		} satisfies Partial<EnvironmentalError>);

		expect(rm).toHaveBeenCalledWith('/tmp/wpk-bootstrapper-999', {
			recursive: true,
			force: true,
		});
	});
});
